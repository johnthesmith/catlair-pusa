/*
    Catlair PHP Copyright (C) 2021 https://itserv.ru

    This program (or part of program) is free software: you can
    redistribute it and/or modify it under the terms of the GNU Aferro
    General Public License as published by the Free Software Foundation,
    either version 3 of the License, or (at your option) any later version.

    This program (or part of program) is distributed in the hope that it
    will be useful, but WITHOUT ANY WARRANTY; without even the implied
    warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See
    the GNU Aferro General Public License for more details. You should have
    received a copy of the GNU Aferror General Public License along with
    this program. If not, see <https://www.gnu.org/licenses/>.

*/

/*
    Pusa — фронтенд-модуль для декларативного управления DOM и событиями.
   ┌──────────┐                  ┌────────────┐                 ┌───────┐
   │          │─── директивы ───▶│    Pusa    │──── контент ───▶│       │
   │ Backend  │                  │ (Frontend) │                 │  DOM  │
   │          │◀─── события ─────│            │◀─── события ────│       │
   └──────────┘                  └────────────┘                 └───────┘
    Позволяет:
    - выделять элементы фокусом для действий;
    - навешивать события и директивы локально или отправлять на сервер;
    - управлять таймерами и состоянием элементов;


    Основные понятия:
        trap - список DOM элементов над которыми выполняются действия
        tray - перечень ключей содержащих значение, для обмена
*/



class Pusa
{
    /* Нормальное состояние */
    static R_OK = "ok";

    /*
        уровни логов
    */
    static LOG_INFO    = "info";
    static LOG_DEBUG   = "debug";
    static LOG_WARNING = "warning";
    static LOG_ERROR   = "error";

    /*
        Операторы управления фокусом
    */
    /* Заменяет текущий trap новым результатом */
    static TRAP_SET     = "set";
    /* Добавляет результат к текущему trap */
    static TRAP_MERGE   = "merge";
    /* Убирает результат из текущего trap */
    static TRAP_EXCLUDE = "exclude";

    /*
        Операторы размещения новых объектов
    */
    /* перед обхектом фокуса в родителе parent[ ..., new, trap ] */
    static INSERT_BEFORE    = "before";
    /* после объекта фокуса в родителе parent[ trap, new, ... ] */
    static INSERT_AFTER     = "after";
    /* первый элемент в вэлементе фокуса trap[ new, ... ] */
    static INSERT_FIRST     = "first";
    /* последний элемент в элементе фокуса trap[ ..., new ] */
    static INSERT_LAST      = "last";
    /* элемент фокуса размещается в новом parent[ ..., new[ trap ], ... ] */
    static INSERT_WRAP      = "wrap";

    /* Перечень разрешенных директив */
    allowedDirectives = new Set
    ([
        /* Действия */
        "config",
        "log",
        "dump",
        /* Управление ловушкой */
        "clear",
        "capture",
        "deep",
        "parents",
        "children",
        "grab",
        "push",
        "pop",
        /* Управление DOM */
        "insert",
        "remove",
        "setAttr",
        "setValue",
        "setProp",
        "setPassive",
        "view",
        "align",
        "scroll",
        "addClasses",
        "removeClasses",
        /* Управление действием*/
        "action",
        "go",
        "trigger",
        "event",
        "start",
        "stop",
        "map",
        "post",
        /* Управление окружением */
        "url",
        "open",
        "title",
        "back",
        "forward",
        /* Работа с tray */
        "setTray",
        "clipboardFromTray",
        "clipboardToTray",
        "copyToTray",
        "pasteFromTray",
        /* Платформозависимые методы */
        "method",
        "js"
    ]);



    /*
        Конструктор Pusa
    */
    constructor
    (
        /* Контейнер для извлечения pusa инструкций */
        initContainerId = null,
        /*
            Адрес вызова инициирующего события
            Если не пустое вызов будет направлен на бэк
        */
        initCall = null
    )
    {
        /* Конфигурация */
        this.cfg =
        {
            /* Подсветка фокуса на странице HTML*/
            highlightTrap: true,
            /* умолчательный адрес событий, если не указан явно при вызове */
            callback: "/pusa/default",
            log:
            {
                /* Управление направлением события журнала console/back */
                info: [ true, false ],
                debug: [ true, false ],
                warning: [ true, false ],
                error: [ true, false ]
            }
        };
        /* основной буфер DOM */
        this.trap = [];
        /* стэк фокуса */
        this.trapStack = [];
        /* именованное хранилище переменных в формате ключ-значение */
        this.tray = {};
        /* активные запросы */
        this.activeRequest = [];

        this.domStorage = new WeakMap();
        /* состояние */
        this.resultCode = Pusa.R_OK;
        this.resultDetail = [];
        /*
            Буффер отправки на back накапливается посредством this.map
            отпавка выполняется директивой this.post
            ключ - аргумент на backend
            значение - литералы или непосредственно выражение
        */
        this.postBuffer = {};
        /*
            перечень действий
            id:
            {
                directives, - массив директив
                throttle    - дискретизация срабатывания mls
            }
        */
        this.actions = {};
        /* Идентификатор запроса */
        this.requestId = 0;
        /* Создание визуального индикатора Pusa */
        this.createIndicator();
        /* последний элемент вызвывший событие */
        this.lastActor = null;
        /* последнее событие на элементе */
        this.lastEvent = null;
        /* оповещение журнала о запуске Pusa*/
        this.log( Pusa.LOG_INFO, 'Pusa started' );

        let el = document.getElementById( 'pusa-init' );
        if( el )
        {
            this.processResponse( 0, null, JSON.parse( el.innerHTML ));
            el.remove();
        }
        else
        {
            if( initCall )
            {
                /* отправка события инициации Pusa */
                this.sendCmd( initCall );
            }
        }
    }



    /*
        Cоздание Pusa
    */
    static create
    (
        /* Контейнер для извлечения pusa инструкций */
        initContainerId = null,
        /* Адрес инициирцющего вызова, если null не выполняется */
        initCall = null
    )
    {
        return new Pusa( initContainerId, initCall );
    }



    /*
        Общий обработчик событий
        При наличии директив выполняет их локально.
        При отсутсвии директив направляет событие на backend
    */
    eventHandler
    (
        /* ключ в this.actions для поиска директив, данных и callback */
        id,
        /* тип события, только для DOM (click, input и т.д.) */
        type = null,
        /* Handler element */
        element = null,
        /* Handler event */
        event = null
    )
    {
        const action = this.actions[ id ];
        if( !action )
        {
            this.log
            (
                Pusa.LOG_WARNING,
                "action-not-found",
                { actionId: id, type }
            );
        }
        else
        {
            const t = parseInt( this.getVal( action.throttle ));
            if( t > 0 )
            {
                /* Проверяем таймер отложенного исполнения события */
                if( !action.throttleTimer )
                {
                    /* Создаем таймер отложенного исполнения события */
                    action.throttleTimer = setTimeout
                    (
                        () =>
                        {
                            this.exec( action.directives, element, event );
                            action.throttleTimer = null;
                            action.lastEvent = null;
                        },
                        t
                    );
                }
            }
            else
            {
                this.exec( action.directives, element, event );
            }
        }
        return this;
    }



    /*
        Отправка команды на сервер
        Техническая реализация
    */
    sendCmd
    (
        /* адрес вызова */
        url,
        /* возвращаемые аргументы в формате ключ значение */
        args = {}
    )
    {
        /* Увеличение идентификатора */
        this.requestId++;
        const requestId = this.requestId;
        this.activeRequest.push( requestId );

        /* AJAX запрос */
        const xhr = new XMLHttpRequest();
        xhr.open( "POST", url || this.cfg.callback, true );
        xhr.setRequestHeader( "Content-Type", "application/json" );
        /* Обработчик */
        xhr.onreadystatechange = () =>
        {
            switch( xhr.readyState )
            {
                case 4:
                    if( xhr.status >= 200 && xhr.status < 300 )
                    {
                        if( xhr.responseText )
                        {
                            let resp;
                            try
                            {
                                /* десериализация и вызов */
                                resp = JSON.parse( xhr.responseText );
                            }
                            catch( e )
                            {
                                this.log
                                (
                                    Pusa.LOG_ERROR,
                                    "pusa-responce-error",
                                    {
                                        status: xhr.status,
                                        url: url,
                                        response: xhr.responseText,
                                    }
                                );
                            }
                            if( resp )
                            {
                                this.processResponse( requestId, url, resp );
                            }
                        }
                        else
                        {
                            this.log
                            (
                                Pusa.LOG_ERROR,
                                "pusa-responce-is-empty",
                                {
                                    status: xhr.status,
                                    url: url
                                }
                            );
                        }
                    }
                    else
                    {
                        this.log
                        (
                            Pusa.LOG_ERROR,
                            "pusa-request-error",
                            xhr.status
                        );
                    }
                break;
            }
        };
        xhr.send
        (
            JSON.stringify
            (
                /* Подготовка данных для POST в формате form-urlencoded */
                {
                    request_id: requestId,
                    ...args
                }
            )
        );
    }



    /*
        Обработка ответа backend
    */
    processResponse
    (
        /* Идентификатор запроса */
        id,
        /* Адрес вызова */
        url,
        /* Ожидается ответ backend { dir: массив директив } */
        resp
    )
    {
        /* убрать из активных запросов */
        const idx = this.activeRequest.indexOf( id );
        if( idx >= 0 ) this.activeRequest.splice( idx, 1 );

        if (Array.isArray(resp) && resp[0]?.code)
        {
            /* Распознанная ошибка backend */
            this.log
            (
                Pusa.LOG_ERROR,
                resp[0]?.code,
                {
                    id: id,
                    url: url,
                    responce: resp
                }
            );
        }
        else
        {
            /* обработка директив */
            if( resp?.dir )
            {
                this.exec( resp.dir );
            }
            else
            {
                this.log
                (
                    Pusa.LOG_ERROR,
                    "pusa-directives-not-found",
                    {
                        id: id,
                        url: url,
                        responce: resp
                    }
                );
            }
        }

        /* обновляем индикатор */
        this.updateIndicator();
        return this;
    }



    /*
        Сборка постбуффера в текущем контексте
    */
    buildPostBuffer()
    {
        /* Формирование аргументов */
        let a = {};
        for( const key in this.postBuffer )
        {
            const val = this.getVal( this.postBuffer[ key ]);
            if( val ) a[ key ] = val;
        }
        return a;
    }



    getVal(operand, element = null)
    {
        if (typeof operand !== 'string') return operand;

        /* Быстрая проверка формата source|subject(|method) */
        if (/^[a-zA-Z0-9_]+(\|[a-zA-Z0-9_]+){1,2}$/.test(operand))
        {
            return this.getValRaw(operand, element);
        }

        /* Иначе — ищем %...% и подставляем */
        return operand.replace(/%(.+?)%/g, (match, inner) =>
        {
            const val = this.getValRaw(inner, element);
            return val !== null && val !== undefined ? val : '';
        });
    }



    /*
        Универсальный экстрактор значения из выражения
        Нотация:
            источник|предмет|способ

        1. Источник — откуда брать данные:
            - value : прямое значение, те возвращается предмет, способ игнорируется
            - item  : текущий элемент при поисках
            - trap : текущий фокусный элемент (this.trap)
            - actor : элемент вызвавший соыбтие (this.lastActor)
            - event : объект события (this.lastEvent)
            - tray  : объект tray
            если не распознано, возвращается исходное значение

        2. Предмет — конкретный атрибут/свойство/ключ, который извлекаем -
           пример: id, href, class, value, name и иные идентификаторы,
           специфичные для источника

        3. Способ — как извлекать из источника, актуален для trap, actor, item:
           - pusa   : по умолчанию, абстрагирует код от специфики js, html.
                        id,
                        type,
                        class,
                        value,
                        name,
                        disabled
           - attr   : DOM-атрибут, не рекомендуется ***.
           - prop   : DOM-свойство, не рекомендуется ***
           - form   : значение атрибута формы с указанным именем

        Примеры:

            trap|id            id текущего первого фокусного элемента
                                (pusa-абстракция по умолчанию)
            trap|class|pusa    класс фокусного элемента через pusa
            actor|id            id элемента, вызвавшего событие
            actor|href|attr     атрибут href элемента-инициатора события
            event|type          тип события (lastEvent.type)
            tray|login          ключ login из объекта tray
            value|any           прямое значение "any"
            abrakadabra         значение абракадабра
    */
    getValRaw
    (
        operand,
        /* Элемент для извлечения */
        element = null
    )
    {
        let r = operand;
        if( typeof operand === 'string' )
        {
            const [ source, second ] = operand.split( /\|(.+)/ );
            switch( source )
            {
                default: r = operand; break;
                case 'event': r = second && this.lastEvent ? this.lastEvent[ second ] : null; break;
                case 'tray': r = second ? this.tray[ second ] : null; break;
                case 'value': r = second; break;
                case 'item':
                case 'trap':
                case 'actor':
                    /* Уточнение элемента источника e */
                    let e = null;
                    switch( source )
                    {
                        case 'item': e = element; break;
                        /* Используем первый фокусны элемент при наличии */
                        case 'trap': e = this.trap[ 0 ]; break;
                        /* Используем последуний событийный элемент */
                        case 'actor': e = this.lastActor; break;
                    }

                    if( !e )
                    {
                        r = null;
                    }
                    else
                    {
                        /* Рзабиваем вторую часть на предмет и метод */
                        let subject = null, method = null;
                        if( second )
                        {
                            [ subject, method ] = second.split( /\|(.+)/ );
                        }
                        switch( method ?? 'pusa' )
                        {
                            case 'pusa':
                                switch( subject )
                                {
                                    case 'id':
                                        r = e.getAttribute ? e.getAttribute( 'id' ) : null;
                                    break;
                                    case 'type':
                                        r = e.tagName.toLowerCase();
                                    break;
                                    case 'class':
                                        r = e.getAttribute( 'class' );
//                                console.log( source, subject, method, r );
                                    break;
                                    case 'disabled':
                                        r = e.disabled === true;
                                    break;
                                    case 'name':
                                        r = e.getAttribute ? e.getAttribute( 'name' ) : null;
                                    break;
                                    case 'value':
                                        r =
                                        (
                                            e.tagName === 'INPUT' &&
                                            (
                                                e.type === 'checkbox' ||
                                                e.type === 'radio'
                                            )
                                        )
                                        ? e.checked
                                        : ( e.value ?? e.innerText );
                                    break;
                                    default:
                                        this.log
                                        (
                                            Pusa.LOG_WARNING,
                                            'unknown-pusa-argument',
                                            {
                                                subject: subject
                                            }
                                        )
                                        r = null;
                                    break;
                                }
                            break;
                            case 'attr':
                                r = subject && getAttribute ? e.getAttribute( subject ) : null;
                            break;
                            case 'prop':
                                r = subject ? e[ subject ] : null;
                            break;
                            case 'form':
                                r
                                = subject && e ?.tagName === 'FORM'
                                ? e.elements[ subject ]?.value ?? null
                                : null;
                            break;
                            default:
                                this.log
                                (
                                    Pusa.LOG_WARNING,
                                    'unknown-extract-method',
                                    {
                                        method: method
                                    }
                                )
                                r = null;
                            break;
                        }
                    }
                break;
            }
        }
        return r;
    }



    /*
        Cheeck tramp is empty end return warning in to log
    */
    checkTrap
    (
        detail
    )
    {
        let r = true;
        if( this.trap.length == 0 )
        {
            r = false;
            this.log
            (
                Pusa.LOG_WARNING,
                'trap-is-empty-for',
                detail
            );
        }
        return r;
    }



    /*
        Выполняет подсветку фокуса если этого требует конфигурация
    */
    highlightTrap()
    {
        if( this.cfg.highlightTrap )
        {
            /* добавить подсветку Pusa */
            this.trap?.forEach(el => el.classList?.add( 'pusa-trap' ));
        }
        return this;
    }



    /*
        Метод применения нового массива к фокусу с учетом оператора
    */
    applyTrap
    (
        /* Массив элементов */
        newTrap,
        /*
            Оператор в аргументах
            { operator: TRAP_SET | TRAP_MERGE | TRAP_EXCLUDE }
        */
        operator = Pusa.TRAP_SET
    )
    {
        /* убрать подсветку Pusa */
        this.trap?.forEach(el => el.classList?.remove( "pusa-trap" ));

        switch( operator )
        {
            case Pusa.TRAP_SET:
                this.trap = newTrap;
            break;
            case Pusa.TRAP_MERGE:
                this.trap = [ ...new Set([ ...this.trap, ...newTrap ]) ];
            break;
            case Pusa.TRAP_EXCLUDE:
                this.trap = this.trap.filter
                (
                    el => !newTrap.includes( el )
                );
            break;
            default:
                /* По умолчанию TRAP_SET */
                this.trap = newTrap;
            break;
        }

        this.highlightTrap();
        return this;
    }



    /*
        Обработка директив
        Выступает маршрутизатором директив
    */
    exec
    (
        /*
            Массив директив
            [
                [ "директива", aргумент1, аргумент2, ... ],
                ...
            ]
        */
        directives,
        /* Элемент для извлечения атрибутов (опционально) */
        element = null,
        /* Событие сформировавшее exec (опуионально) */
        event = null
    )
    {
        if( !Array.isArray( directives ))
        {
            this.log
            (
                Pusa.LOG_WARNING,
                "response-is-not-an-array",
                directives
            );
        }
        else
        {
            this.lastEvent = event;
            this.lastActor = element;
            directives.forEach
            (
                item =>
                {
                    const [ dir, ...args ] = item;
                    if
                    (
                        this.allowedDirectives.has( dir ) &&
                        typeof this[ dir ] === "function"
                    )
                    {
                        /* Исполнение директивы */
                        this[ dir ].apply( this, args );
                    }
                    else
                    {
                        this.log
                        (
                            Pusa.LOG_WARNING,
                            "unknown-pusa-directive",
                            {
                                directive: dir,
                                arguments: args
                            }
                        );
                    }
                }
            );
            this.lastEvent = null;
            this.lastActor = null;
        }
        return this;
    }



    /*
        Проверка DOM-элемента по фильтру (массивная форма)
        Операторы:
            [ "and", true, true, ... ] = true
            [ "or", true, false, ... ] = true
            [ "not", true ] = false
            [ "in", niddle, stack ] = false
            [ "equal", "operand1", "operand2" ] = false
        Операнды см getVal
        Вложенности:
            [ "or", [ "equal", "trap id", "my" ], [ "equal", "trap id", "MY" ]]
    */
    filter
    (
        elem,
        cond
    )
    {
        if (!Array.isArray(cond)) return !!cond;

        /* извлечение оператора и аргументов */
        const [op, ...args] = cond;
        switch( op )
        {
            case "!=":
            case "not-equal":
            {
                const [left, right] = args;
                return this.getVal( left, elem ) != this.getVal( right, elem );
            }
            case "==":
            case "equal":
            {
                const [left, right] = args;
                return this.getVal( left, elem ) == this.getVal( right, elem );
            }
            case "in":
            {
                const [ left, right ] = args;
                let stack = this.getVal( right, elem );
                if( stack )
                {
                    let needle = this.getVal( left, elem );
                    stack = stack.split(/\s+/);
                    return stack.includes(needle);
                }
            }
            case "!":
            case "not":
                return !this.filter( elem, args[ 0 ]);
            case "&":
            case "and":
                return args.every( sub => this.filter( elem, sub ));
            case "|":
            case "or":
                return args.some( sub => this.filter( elem, sub ));
            default:
                this.log
                (
                    Pusa.LOG_WARNING,
                    "unknown-filter-operator",
                    cond
                );
                return null;
        }
        return false;
    }



    /*
        Установка состояния Pusa
    */
    setResult
    (
        /* Код состояния */
        code,
        /* Детализация состояния */
        detail = []
    )
    {
        this.resultCode = code;
        this.resultDetail = detail;
        return this;
    }



    /**************************************************************************
        Работа с визуальным индикатором ожидания загрузки
    */


    /*
        Создание визуального индикатора обмена с сервером
        Рекомендуемый css для индикатора
        #pusa-indicator
        {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
            z-index: 9999;
            background-image: src( loader.png );
            background-size: contain;
            background-repeat: no-repeat;
            width: 100px;
            height: 100px;
            display: none;
        }
        #pusa-indicator.show { display: block; }
        #pusa-indicator.hide { display: none; }

    */
    createIndicator()
    {
        return this
        .push()
        .capture([ 'document', 'body' ])
        .insert( null, Pusa.INSERT_LAST )
        .setAttr([{ id: "pusa-indicator", class: "hide" }])
        .pop()
        ;
    }


    /*
        Обновление индикатора активных запросов
    */
    updateIndicator()
    {
        return this
        .push()
        .capture([ 'document', 'body' ])
        .children( [ "equal", "item|id", "pusa-indicator" ] )
        .setAttr([{ class: this.activeRequest.length > 0 ? "show" : "hide" }])
        .pop()
        ;
    }



    /**************************************************************************
        Директивы
    */


    /*
        Применение конфигурации pusa-front
    */
    config
    (
        /* Массив значений key:value */
        cfg = {}
    )
    {
        this.cfg = { ...this.cfg, ...cfg };
        return this;
    }



    /*
        Сброс фокуса в пустое значение
    */
    clear()
    {
        this.applyTrap([]);
        return this;
    }




    /*
        Загрузка в буффер родителей элементов буффера.
        Дубли удаляются, подъем ограничен body.
        Фильтр применяется только к включению в результат,
        но не останавливает продвижение вверх.
        Это практично: родитель может быть не интересен,
        но его предки — важны.
    */
    parents
    (
        /* условия фильтрации */
        filter = true,
        /* глубина проведения поиска, 0 - вся цепочка*/
        depth = 1,
        /* функция для операции изменения фокуса после поиска */
        operator = Pusa.TRAP_SET
    )
    {
        let currentTrap = [ ...this.trap ];
        let result = [];
        for
        (
            let i = 0;
            currentTrap.length > 0 && (depth === 0 || i < depth);
            i++
        )
        {
            const nextTrap = [];
            for(let el of currentTrap)
            {
                const parent = el.parentElement;
                if
                (
                    !parent ||
                    parent === document.documentElement ||
                    nextTrap.includes(parent)
                ) continue;
                nextTrap.push(parent);
                const res = this.filter(parent, filter);
                if(res === null) return this; /* останавливаем весь обход */
                if( res && !result.includes( parent ))
                {
                    result.push(parent);
                }
            }
            currentTrap = nextTrap;
            if(currentTrap.length === 0) break;
        }

        this.applyTrap(result, operator);
        return this;
    }


    /*
        Загрузка в буффер дочерних элементов элементов фокуса.
        Дубли удаляются, спуск ограничен depth.
        Фильтр применяется только к включению в результат,
        но не останавливает обход.
    */
    children
    (
        /* условия фильтрации */
        filter = true,
        /* глубина проведения поиска, 0 - вся цепочка*/
        depth = 0,
        /* функция для операции изменения фокуса после поиска */
        operator = Pusa.TRAP_SET
    )
    {
        let currentTrap = [ ...this.trap ];
        let resultBuffer = [];
        /* Цикл глубины */
        for
        (
            let i = 0;
            currentTrap.length > 0 && ( depth === 0 || i < depth );
            i++
        )
        {
            const nextTrap = [];
            /* Цикл фокусных элементов */
            for(let el of currentTrap)
            {
                if (el.nodeType === 1)
                {
                    /* Цикл по детям фокусного элемента */
                    for( let child of Array.from( el.children ))
                    {
                        if
                        (
                            !resultBuffer.includes( child ) &&
                            !nextTrap.includes( child )
                        )
                        {
                            nextTrap.push( child );
                            if( this.filter( child, filter ) )
                            {
                                resultBuffer.push( child );
                            }
                        }
                    }
                }
            }
            currentTrap = nextTrap;
            if( currentTrap.length === 0 ) break;
        }

        this.applyTrap( resultBuffer, operator );
        return this;
    }



    /*
        Помещает событийный элемент в фокус
    */
    grab
    (
        /* функция для операции изменения фокуса после поиска */
        operator = Pusa.TRAP_SET
    )
    {
        return this.applyTrap([ this.lastActor ], operator );
    }



    /*
        Сохранение текущего фокуса в стек
    */
    push()
    {
        this.trapStack.push([...this.trap]);
        return this;
    }



    /*
        Восстановление фокуса из стека
    */
    pop()
    {
        if( this.trapStack.length > 0 )
        {
            this.clear();
            this.trap = this.trapStack.pop();
            this.highlightTrap();
        }
        else
        {
            this.setResult( "stack-is-empty", []);
        }
        return this;
    }



    /*
        Создание объектов DOM
        В родителе от каждого объекта фокуса создается
        новая нода. Созданные ноды размещаются
        в фокусе вместо имеющихся.
    */
    insert
    (
        /* имя тэга div, span и тд */
        content = null,
        /* location operator INSERT_*/
        loc = Pusa.INSERT_LAST,
        /* count - количество объектов */
        count = 1
    )
    {
        const created = [];
        content = content ?? '<div></div>';

        this.trap.forEach
        (
            el =>
            {
                for (let i = 0; i < count; i++)
                {
                    const tmp = document.createElement('div');
                    tmp.innerHTML = content;

                    const children = Array.from( tmp.childNodes );
                    if (children.length === 0) return;

                    /* первый элемент по loc */
                    const first = children.shift();
                    switch(loc)
                    {
                        case Pusa.INSERT_BEFORE:
                            el.parentNode.insertBefore(first, el);
                            break;
                        case Pusa.INSERT_AFTER:
                            el.parentNode.insertBefore(first, el.nextSibling);
                            break;
                        case Pusa.INSERT_FIRST:
                            el.insertBefore(first, el.firstChild);
                            break;
                        case Pusa.INSERT_LAST:
                            el.appendChild(first);
                            break;
                        case Pusa.INSERT_WRAP:
                            if (el.parentNode)
                            {
                                el.parentNode.insertBefore(first, el);
                                first.appendChild(el);
                            }
                            break;
                        default:
                            this.log(Pusa.LOG_ERROR, "unknown-insert-location", { loc, content });
                            return this;
                    }
                    created.push(first);

                    /* все остальные элементы просто вставляем после первого */
                    children.forEach(child =>
                    {
                        first.parentNode.insertBefore(child, first.nextSibling);
                        created.push(child);
                    });
                }
            }
        );

        this.applyTrap(created);
        return this;
    }



    /*
        Удаление элементов, находящихся в фокусе.
        - Перед удалением очищаются все слушатели событий.
        - Сбрасываются активные таймеры (throttle) для элементов.
        - Элементы удаляются из domStorage.
        - После удаления фокус переносится на родителей удалённых элементов.
    */
    remove()
    {
        let newTrap = [];
        for( let el of this.trap )
        {
            /* Получаем данные элемента из хранилища */
            const data = this.domStorage.get( el );

            /* Удаляем слушатель события, если есть */
            if( data?.handler && data?.type )
            {
                el.removeEventListener( data.type, data.handler );
            }

            /* Удаляем элемент из хранилища */
            this.domStorage.delete( el );

            /* Добавляем родителя элемента в новый фокус */
            if( el.parentNode && !newTrap.includes( el.parentNode ))
            {
                newTrap.push( el.parentNode );
            }

            /* Удаляем сам элемент из DOM */
            el.remove();
        }

        /* Применяем новый фокус */
        this.applyTrap( newTrap );
        return this;
    }



    /*
        Makes it impossible for elements in trap to be selected in the UI.
        Elements cannot be selected and are only available for events like tap, click, etc.
    */
    setPassive
    (
        /*
            true - element is not selectable,
            false - element is selectable
        */
        flag = true
    )
    {
        this.trap.forEach
        (
            (el, i) =>
            {
                el.setAttribute( "tabindex", flag ? "-1" : "0" );
                /* Отменяем стандартный mousedown, чтобы фокус не уходил */
                if( flag )
                {
                    el.addEventListener
                    (
                        "mousedown",
                        e => e.preventDefault()
                    );
                }
                else
                {
                    /* Удаляем обработчик, если элемент снова обычный */
                    el.removeEventListener
                    (
                        "mousedown",
                        e => e.preventDefault()
                    );
                }
            }
        );
        return this;
    }



    /*
        Перемещает все элементы в this.trap так, чтобы они полностью
        помещались в viewport. Если элемент уже видим — не трогает.
    */
    align()
    {
alert('asd')
        this.trap.forEach(el =>
        {
            const style = el.style;
            const cs = getComputedStyle(el);

            let left = parseFloat(cs.left) || 0;
            let top  = parseFloat(cs.top)  || 0;

            const width  = el.offsetWidth;
            const height = el.offsetHeight;

            const viewportWidth  = window.innerWidth;
            const viewportHeight = window.innerHeight;
console.log( viewportWidth, viewportHeight);
            if (left + width > viewportWidth)
                left = viewportWidth - width;

            if (top + height > viewportHeight)
                top = viewportHeight - height;

            if (left < 0) left = 0;
            if (top  < 0) top  = 0;

            style.left = left + 'px';
            style.top  = top  + 'px';
        });

       return this;
    }


    /*
        Makes the first traped element visible in the viewport.
    */
    view
    (
        /* behavior smooth */
        smooth = false
    )
    {
        const el = this.trap[0];
        if( el )
        {
            el.scrollIntoView
            (
                {
                    block: "nearest",
                    inline: "nearest",
                    behavior: smooth ?  'smooth' : 'auto'
                }
            );
        }
        return this;
    }



    /*
        Scrolls the first traped element by given offsets or to start/end.
        Accepts numbers (relative) or "start"/"end" (absolute).
    */
    scroll
    (
        /* horizontal offset or "start"/"end" */
        x = 0,
        /* vertical offset or "start"/"end" */
        y = 0,
        /* behavior smooth */
        smooth = false
    )
    {
        this.trap.forEach
        (
            el =>
            {
                el.scrollTo
                (
                    {
                        left:
                            (x === "start")
                            ? 0
                            : (x === "end")
                            ? el.scrollWidth
                            : x,
                        top:
                            (y === "start")
                            ? 0
                            : (y === "end")
                            ? el.scrollHeight
                            : y,
                        behavior: smooth ?  'smooth' : 'auto'
                    }
                );
            }
        );
        return this;
    }



    /*
        Регистрация списка директив как именованного действия.
        В дальнейшем это действие может быть запущено по таймеру
        или по событию от DOM элемента.
    */
    action
    (
        /* Идентификатор действия */
        id,
        /* массив pusa директив для исполнения при срабатывании */
        directives,
        /*
            интервал между срабатываниями (мс), 0 - каждое событие,
            либо литерал
        */
        throttle = 0
    )
    {
        if( directives === null ) directives = [];
        const old = this.actions[ id ];
        if( old )
        {
            /* Сброс периодического события если назначено командой start */
            if( old.timer )
            {
                clearTimeout( old.timer );
                clearInterval( old.timer );
            }
            /* Сброс тротл таймера */
            if( old.throttleTime )
            {
                clearTimeout( old.throttleTime );
            }
        }

        /* Создание записи события */
        this.actions[ id ] =
        {
            directives: directives,
            throttle: throttle,
            timer: null,
            /* Последнее событие для учета тротлинга */
            lastEvent: null,
            /* Таймер троблинга будет запущен при есть есть тролинг */
            timerThrottle: null
        };
        return this;
    }




    /*
        В зависимости от условия выпоет одно из двух действий
    */
    go
    (
        /* Условие обрабатывается через фльтр */
        condition,
        /* Действие при положительном условии */
        trueActionId,
        /* Действие при отрицательном условии */
        falseActionId
    )
    {
        const actionId = this.getVal
        (
            this.filter( null, condition )
            ? trueActionId
            : falseActionId,
            null
        );
        const action = this.actions[ actionId ];
        if( action )
        {
            this.exec( action.directives );
        }
        else
        {
            this.log
            (
                this.LOG_WARNING,
                'action-for-trigger-not-found',
                { id: actionId }
            );
        }
        return this;
    }



    /*
        В зависимости от условия выпоет одно из двух действий
    */
    trigger
    (
        /* Условие обрабатывается через фльтр */
        condition,
        /* Действие при положительном условии */
        trueActionId,
        /* Действие при отрицательном условии */
        falseActionId
    )
    {
        this.trap.forEach
        (
            el =>
            {
                const actionId = this.getVal
                (
                    this.filter( el, condition )
                    ? trueActionId
                    : falseActionId,
                    el
                );
                const action = this.actions[ actionId ];
                if( action )
                {
                    /* передаём текущий элемент */
                    this.exec( action.directives, el );
                }
                else
                {
                    this.log
                    (
                        this.LOG_WARNING,
                        'action-for-trigger-not-found',
                        { id: actionId }
                    );
                }
            }
        );
        return this;
    }



    /*
        Привязывает событие action к обработчику DOM для всех элементов в фокусе
        Для каждого элемента применяет свой идентификатор события.
        Если id — массив, используется циклически.
    */
    event
    (
        /* Тип DOM-события (click, input и т.д.) */
        type,
        /* Идентификатор действия action или массив идентификаторов */
        id,
        /* Растространять событие на родителя */
        stop = false
    )
    {
        const ids = Array.isArray(id) ? id : [ id ];
        const n = ids.length;

        /* Цикл по всем элементам фокуса */
        if( this.checkTrap({ directive: 'event', type: type, id: id }))
        {
            this.trap.forEach
            (
                ( el, i ) =>
                {
                    const actionId = ids[ i % n ];
                    const stored = this.domStorage.get( el ) || {};

                    /* Снимаем старый обработчик того же типа */
                    if( stored.handlers && stored.handlers[ type ])
                    {
                        el.removeEventListener(type, stored.handlers[type]);
                    }

                    /* Создаем новый обработчик */
                    const handler = (evt) =>
                    {
                        if( actionId !== null )
                        {
                            /* Вызываем обработчик */
                            this.eventHandler( actionId, type, el, evt );
                        }
                        if( stop )
                        {
                            /* Обрываем распространение события */
                            evt.stopPropagation();
                        }
                    };

                    /* Добавляем обработчик к объекту */
                    el.addEventListener( type, handler );

                    /* Обновляем только нужные ключи, сохраняя остальное */
                    this.domStorage.set
                    (
                        el,
                        {
                            ...stored,
                            handlers: { ...stored.handlers, [ type ]: handler },
                            actionId
                        }
                    );
                }
            );
        }
        return this;
    }



    /*
        Директива map: накапливает литералы в буфер для последующего post
    */
    map
    (
        /* аргументы в формате ключ значение (getVal) */
        args = {}
    )
    {
        this.postBuffer = { ...( this.postBuffer || {}), ...args };
    }



    /*
        Вызов удаленного метода с указанным url,
        при этом this.postBuffer будет использован как аргументы
    */
    post
    (
        /* адрес вызова */
        url
    )
    {
        /* Собрали буффер значений для отправки */
        const buffer = this.buildPostBuffer();
        /* Очистили буффер */
        this.postBuffer = {};
        /* Отправили по URL */
        this.sendCmd( url, buffer );
    }



    /*
        Запускает таймер на событии
    */
    start
    (
        /* идентификатор события */
        id,
        /* интервал срабатывания */
        timeoutMls = 1,
        /* true = interval, false = один раз */
        continues = true
    )
    {
        const evt = this.actions[ id ];
        if( !evt )
        {
            this.log( Pusa.LOG_ERROR, "start:timer-not-found", { id:id } );
        }
        else
        {
            /* Останавливаем существующий таймер в событии */
            this.stop( id );

            /* Описываем обработчик таймера */
            const cb = () =>
            {
                this.eventHandler( id, "timer" );
                if( !continues ) evt.timer = null;
            };

            /* Создаем и сохраняем таймер внутри события */
            evt.timer = continues
                ? setInterval(cb, timeoutMls)
                : setTimeout(cb, timeoutMls);
        }

        return this;
    }



    /*
        Останавливает таймер
    */
    stop
    (
        /* идентификатор события останавливаемого таймера */
        id
    )
    {
        const evt = this.actions[ id ];
        if( evt )
        {
            clearInterval( evt.timer );
            evt.timer = null;
        }
        return this;
    }



    /*
        Replace current URL without reloading page.
        Accepts a new URL string.
    */
    url
    (
        /* New url */
        url
    )
    {
        if( typeof url === "string" && window.history?.replaceState )
        {
            window.history.replaceState( null, "", url );
        }
        return this;
    }



    /*
        Открытие предоставленного url
    */
    open
    (
        /*  ссылка */
        url = null,
        /* окно направление target, _blank, _self... */
        target = "_self"
    )
    {
        if( url )
        {
            window.open( url, target );
        }
        else
        {
            window.location.reload( true );
        }
        return this;
    }



    /*
        Установка заголовка документа
    */
    title
    (
        /* заголовок устанавливаемый */
        title
    )
    {
        document.title = title;
        return this;
    }



    /*
        Переход назад в истории браузера
    */
    back()
    {
        window.history.back();
        return this;
    }



    /*
        Переход вперёд в истории браузера
    */
    forward()
    {
        window.history.forward();
        return this;
    }



    /*
        Установка именнованного значения трея
    */
    setTray
    (
        /* ключ лотка, допстимы литералы *-tray */
        key = null,
        /* устанавливаемое значение, *-tray */
        value = null
    )
    {
        if( key !== null )
        {
            this.tray[ this.getVal( key )] = this.getVal( value );
        }
        return this;
    }



    /*
        Размещает значение из tray в буфер обмена
    */
    clipboardFromTray
    (
        /* ключ tray */
        key = null
    )
    {
        if( key !== null )
        {
            navigator.clipboard.writeText( this.tray[ key ]);
        }
        return this;
    }



    /*
        Размещает значение буфера обмена в ключе лотка
        Метод асинхронен
    */
    clipboardToTray
    (
        /* имя ключа в лотке */
        key = null,
        /* директивы для выполнения после получения значения */
        directives = []
    )
    {
        if( key !== null )
        {
            navigator.clipboard.readText().then
            (
                val =>
                {
                    /* Асинхронне размещение значения */
                    this.tray[ key ] = val;
                    /* Запуск директив */
                    this.exec( directives );
                }
            );
        }
        return this;
    }



    /*
        Размещает выбранный на странице текст в специфический
        ключ лотка
    */
    async copyToTray
    (
        /* имя ключа в лотке */
        key = null
    )
    {
        if( key )
        {
            this.tray[ key ] = window.getSelection().toString();
        }
        return this;
    }



    /*
        Устанавливает атрибуты для всех элементов в фокусе.
        Каждый элемент получает объект из массива tupple по индексу i % n.
        Если передан один объект, он применяется ко всем элементам.
    */
    setAttr
    (
        /* Массив объектов { key: value, ... } или один объект */
        tupple = []
    )
    {
        if( !Array.isArray(tupple) )
        {
            tupple = [tupple];
        }

        if( tupple.length )
        {
            const n = tupple.length;
            this.trap.forEach
            (
                ( el, i ) =>
                {
                    const attrs = tupple[i % n]; /* циклично */
                    for( const k in attrs )
                    {
                        if( el.setAttribute )
                        {
                            el.setAttribute( k, this.getVal( attrs[k], el ));
                        }
                    }
                }
            );
        }
        return this;
    }



    /*
        Set attributes or values for all traped elements
        - INPUT[type=text|…]: .value
        - INPUT[type=checkbox|radio]: .checked
        - TEXTAREA: .value
        - Others: .innerHTML
        Tuples repeat cyclically if fewer than trap elements
    */
    setValue
    (
        values = []
    )
    {
        if(this.checkTrap({ directive: 'setValue', values: values }))
        {
            const n = values.length;
            this.trap.forEach
            (
                ( el, i ) =>
                {
                    const val = this.getVal(values[ i % n ], el );
                    switch( el.tagName )
                    {
                        case "INPUT":
                            switch( el.type.toLowerCase() )
                            {
                                case "checkbox":
                                case "radio":
                                    el.checked = !!val;
                                break;
                                case "text":
                                case "search":
                                case "password":
                                case "tel":
                                case "url":
                                    el.value = val;
                                break;
                                default:
                                    el.value = val;
                                break;
                            }
                        break;
                        case "TEXTAREA":
                            el.value = val;
                        break;
                        default:
                            el.innerHTML = val;
                    }
                }
            );
        }
        return this;
    }



    /*
        Установка свойств в фокусе
        Поддержка массивов объектов и циклическое применение
    */
    setProp
    (
        /* Кортежи ключ значение { key: value, ... }, {...} */
        tupple = []
    )
    {
        if( this.checkTrap({ directive: 'setValue', tupple: tupple }))
        {
            if( !Array.isArray( tupple ))
            {
                tupple = [tupple];
            }
            const n = tupple.length;
            this.trap.forEach
            (
                ( el, i ) =>
                {
                    const attrs = tupple[i % n];
                    for( const k in attrs )
                    {
                        el[ k ] = this.getVal( attrs[k], el );
                    }
                }
            );
        }
        return this;
    }



    /*
        Добавление класса
        выполняется циклическое добавление
        указанных классов для элементов в фокусе
    */
    addClasses
    (
        arg = []
    )
    {
        if( Array.isArray( arg ) && arg.length )
        {
            const n = arg.length;
            this.trap.forEach( ( el, i ) =>
            {
                const classes = arg[ i % n ];
                if( Array.isArray( classes ) )
                {
                    classes.forEach( cls => el.classList.add( cls ) );
                }
            });
        }
        return this;
    }



    /*
        Удаление классов
        выполняется циклическое удаление
        указанных классов для элементов в фокусе
    */
    removeClasses
    (
        /* [ [ class1, class2, ... ], [...] ] */
        arg = []
    )
    {
        if( Array.isArray( arg ) && arg.length )
        {
            const n = arg.length;
            this.trap.forEach( ( el, i ) =>
            {
                const classes = arg[ i % n ];
                if( Array.isArray( classes ) )
                {
                    classes.forEach( cls => el.classList.remove( cls ) );
                }
            });
        }
        return this;
    }



    /*
        создать CSS-класс с атрибутами
    */
    classCreate
    (
        /* идентификтаор создаваемого класса */
        id
    )
    {
        return this;
    }



    /*
        удалить CSS-класс
    */
    classDelete
    (
        /*
            id - идентификтаор создаваемого класса
        */
        arg
    )
    {
        return this;
    }



    /**************************************************************************
        Платформозависимые директивы
        Использование рекомендуется с пониманием ограничения и привязки
        пользовательского функционала к реализациям
    */


    /*
        Загрузка в trap объекта браузера
        Предыдущее состояние ловушки сбрасывается.
    */
    capture
    (
        /* массив вида [ 'window', 'history' ]*/
        path
    )
    {
        let obj = globalThis;
        for( const key of path )
        {
            if( obj[ key ])
            {
                obj = obj[ key ];
            }
            else
            {
                this.log( Pusa.LOG_ERROR, "object-not-found", { path:path } );
                break;
            }
        }
        this.applyTrap([ obj ]);
        return this;
    }



    /*
        Загрузка в trap методов свойств объектов в ловушке
        Предыдущее состояние ловушки сбрасывается.
    */
    deep
    (
        /*
            Путь до требуемого свойства или метода
            массив вида [ 'style', ... ]
        */
        path
    )
    {
        if( this.checkTrap({ directive: 'deep', path: path }))
        {
            const newTrap = [];
            this.trap.forEach
            (
                ( el ) =>
                {
                    let obj = el;
                    for( const key of path )
                    {
                        if( obj && obj[key] !== undefined )
                        {
                            obj = obj[key];
                        }
                        else
                        {
                            this.log
                            (
                                Pusa.LOG_ERROR,
                                "object-not-found",
                                { path }
                            );
                            obj = null;
                            break;
                        }
                    }
                    if( obj !== null )
                    {
                        newTrap.push(obj);
                    }
                }
            );
            this.applyTrap( newTrap );
        }
        return this;
    }



    /*
        Вызов метода для каждого фокусе
    */
    method
    (
        /* вызываемый метод */
        method,
        /* аргументы для метода */
        args = [],
        /* ключ в в трее в который будет размещен результат*/
        key
    )
    {
        for( let el of this.trap )
        {
            if (typeof el[ method ] === "function")
            {
                let result = el[ method ](...( args ));
                if( key )
                {
                    this.tray[ key ] = result;
                }
            }
        }
        return this;
    }



    /*
        Выполнение произвольного JS кода с записью результата или ошибки в трей
    */
    js
    (
        /* код JS */
        js,
        /* ключ в трей для результата/исключения */
        key
    )
    {
        if( js && key )
        {
            try
            {
                this.tray[ key ] = eval( js );
            }
            catch( e )
            {
                this.tray[ key ] = e.toString();
                this.log( Pusa.LOG_ERROR, "js-error", e );
            }
        }
        return this;
    }



    /**************************************************************************
        Журналирование
    */

    log
    (
        /* тип журнала, info, debug, warning, error */
        type,
        /* сообщение */
        msg,
        /* детальная информация */
        detail = {},
        /* источник лога, для front не указываем значение */
        origin = "front"
    )
    {
        const route = this.cfg.log[ type ] || [ true, false ];

        /* Вывод в консоль */
        if( route[0] && origin !== "back" )
        {
            switch( type )
            {
                case "error":   console.error( msg, detail ); break;
                case "warning": console.warn( msg, detail );  break;
                case "debug":   console.debug( msg, detail ); break;
                case "info":    console.info( msg, detail );  break;
                default:        console.log( msg, detail );   break;
            }
        }

        /* Отправка на бэк */
        if( route[1] && origin !== "back" )
        {
            this.sendCmd
            (
                '/log/message',
                {
                    /* уровень: info/debug/warning/error */
                    level:  type,
                    /* сообщение */
                    msg:    msg,
                    /* дополнительные данные */
                    detail: detail
                }
            );
        }

        return this;
    }



    /*
        Отладочный метод вывода фокуса в консоль
    */
    dump()
    {
        console.group( 'Pusa dump' );
        console.info( 'Config:', this.cfg );
        console.info( 'Trap:', this.trap );
        console.info( 'Tray:', this.tray );
        console.info( 'Actions:', this.actions );
        console.info( 'Post buffer:', this.postBuffer );
        console.info( 'Builded post buffer:', this.buildPostBuffer() );
        console.info( 'Last event element:', this.lastActor );
        console.info( 'Last event:', this.lastEvent );
        console.groupEnd();
        return this;

    }
}
