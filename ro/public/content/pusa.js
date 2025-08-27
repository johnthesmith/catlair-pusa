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
    /* Заменяет текущий focus новым результатом */
    static FOCUS_SET     = "set";
    /* Добавляет результат к текущему focus */
    static FOCUS_MERGE   = "merge";
    /* Убирает результат из текущего focus */
    static FOCUS_EXCLUDE = "exclude";

    /*
        Операторы размещения новых объектов
    */
    /* перед обхектом фокуса в родителе parent[ ..., new, focus ] */
    static INSERT_BEFORE    = "before";
    /* после объекта фокуса в родителе parent[ focus, new, ... ] */
    static INSERT_AFTER     = "after";
    /* первый элемент в вэлементе фокуса focus[ new, ... ] */
    static INSERT_FIRST     = "first";
    /* последний элемент в элементе фокуса focus[ ..., new ] */
    static INSERT_LAST      = "last";
    /* элемент фокуса размещается в новом parent[ ..., new[ focus ], ... ] */
    static INSERT_WRAP      = "wrap";

    /* Перечень разрешенных директив */
    allowedDirectives = new Set
    ([
        "config", "clear", "root", "body", "parents", "children", "push", "pop",
        "insert", "remove", "setAttr", "setProp", "setContent", "addClasses",
        "removeClasses", "domEvent", "event", "start", "stop", "open", "title", "back",
        "forward", "set", "get", "toClipboard", "fromClipboard", "log", "call", "js"
    ]);

    /*
        Конструктор Pusa
    */
    constructor
    (
        /*
            Адрес вызова инициирующего события
            Если не пустое вызов будет направлен на бэк
        */
        initCallback = null
    )
    {
        /* Конфигурация */
        this.cfg =
        {
            /* Подсветка фокуса на странице HTML*/
            highlightFocus: false,
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
        this.focus = [];
        /* стэк фокуса */
        this.focusStack = [];
        /* именованное хранилище переменных в формате ключ-значение */
        this.tray = {};
        /* активные запросы */
        this.activeRequest = [];


        this.domStorage = new WeakMap();
        /* состояние */
        this.resultCode = Pusa.R_OK;
        this.resultDetail = [];
        /* перечень событий id_event: { directives, callback, data, throttle } */
        this.events = {};
        /* Идентификатор запроса */
        this.requestId = 0;
        /* Создание визуального индикатора Pusa */
        this.createIndicator();
        /* оповещение журнала о запуске Pusa*/
        this.log( Pusa.LOG_INFO, 'Pusa started' );
        if( initCallback )
        {
            /* отправка события инициации Pusa */
            this
            .event( "init", initCallback )
            .eventHandler( "init", { moment: Date.now() });
        }
    }



    /*
        Cоздание Pusa
    */
    static create()
    {
        return new Pusa();
    }


    /*
        Общий обработчик событий
        При наличии директив выполняет их локально.
        При отсутсвии директив направляет событие на backend
    */
    eventHandler
    (
        /* ключ в this.events для поиска директив, данных и callback */
        id,
        /* объект события (DOM Event, таймер или Pusa) */
        event = null,
        /* тип события, только для DOM (click, input и т.д.) */
        type = null
    )
    {
        const evt = this.events[ id ];
        if( evt === undefined )
        {
            this.log( Pusa.LOG_WARNING, "event-not-found", { eventId: id, type });
        }
        else
        {
            if( evt !== null )
            {
                /* Испольнение события */
                const run = () =>
                {
                    const { directives, data, callback } = evt;
                    if( Array.isArray( directives ) && directives.length > 0 )
                        this.exec( directives );
                    else
                        this.sendCommand( type, data, event, callback );
                };
                if( evt.throttle > 0 )
                {
                    evt.lastEvent = event;
                    /* Проверяем таймер отложенного исполнения события */
                    if( !evt.throttleTimer )
                    {
                        /* Создаем таймер отложенного исполнения события */
                        evt.throttleTimer = setTimeout
                        (
                            () =>
                            {
                                run();
                                evt.throttleTimer = null;
                                evt.lastEvent = null;
                            },
                            evt.throttle
                        );
                    }
                }
                else
                {
                    run();
                }
             }
        }
        return this;
    }



    /*
        Отправка команды на сервер
        cmd — объект команды
    */
    sendCommand
    (
        /* тип события */
        type,
        /* данные вызывающей стороны */
        data,
        /* аргументы события */
        event,
        /* адрес вызова */
        callback
    )
    {
        this.requestId ++;
        const requestId = this.requestId;
        this.activeRequest.push( requestId );

        /* сериализация в JSON */
        const payload = JSON.stringify
        ({
            id: requestId,
            type: type,
            data: data,
            event: event
        });

        /* AJAX запрос */
        const xhr = new XMLHttpRequest();
        xhr.open( "POST", callback || this.cfg.callback, true );
        xhr.setRequestHeader
        (
            "Content-Type",
            "application/json;charset=UTF-8"
        );

        /* Обработчик */
        xhr.onreadystatechange = () =>
        {
            if( xhr.readyState === 4 )
            {
                if( xhr.status >= 200 && xhr.status < 300 )
                {
                    let resp;
                    try
                    {
                        /* десериализация и вызов */
                        resp = JSON.parse( xhr.responseText );
                    }
                    catch( e )
                    {
                        this.error( "pusa-responce-error", e );
                    }
                    if( resp )
                    {
                        this.processResponse( requestId, resp );
                    }
                }
                else
                {
                    this.error( "pusa-request-error", xhr.status );
                }
            }
        };
        xhr.send(payload);
    }



    /*
        Обработка ответа backend
    */
    processResponse
    (
        /* Идентификатор запроса */
        id,
        /*
            Ответ backend
            {
                dir: массив директив
            }
        */
        resp
    )
    {
        /* убрать из активных запросов */
        const idx = this.activeRequest.indexOf( id );
        if(idx >= 0) this.activeRequest.splice( idx, 1 );

        /* обработка директив */
        if(resp?.dir)
        {
            this.exec(resp.dir);
        }
        /* обновляем индикатор */
        this.updateIndicator();
        return this;
    }



    /*
        Метод применения нового массива к фокусу с учетом оператора
    */
    applyFocus
    (
        /* Массив элементов */
        newFocus,
        /*
            Оператор в аргументах
            { operator: FOCUS_SET | FOCUS_MERGE | FOCUS_EXCLUDE }
        */
        operator = Pusa.FOCUS_SET
    )
    {
        /* убрать подсветку Pusa */
        this.focus?.forEach(el => el.classList?.remove( "pusa-focus" ));

        switch( operator )
        {
            case Pusa.FOCUS_SET:
                this.focus = newFocus;
            break;

            case Pusa.FOCUS_MERGE:
                this.focus = [ ...new Set([ ...this.focus, ...newFocus ]) ];
            break;

            case Pusa.FOCUS_EXCLUDE:
                this.focus = this.focus.filter
                (
                    el => !newFocus.includes( el )
                );
            break;

            default:
                /* По умолчанию FOCUS_SET */
                this.focus = newFocus;
            break;
        }

        if( this.cfg.highlightFocus )
        {
            /* добавить подсветку Pusa */
            this.focus?.forEach(el => el.classList?.add( "pusa-focus" ));
        }

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
        directives
    )
    {
        if( !Array.isArray( directives ))
        {
            this.log( Pusa.LOG_WARNING, "response-is-not-an-array", directives );
        }
        else
        {
            directives.forEach
            (
                item =>
                {
                    const [ dir, ...args ] = item;
                    if
                    (
                        this.allowedDirectives.has(dir) &&
                        typeof this[ dir ] === "function"
                    )
                    {
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
        }
        return this;
    }



    /*
        Проверка DOM-элемента по фильтру (массивная форма)
        Операторы:
            [ "and", true, true, ... ] = true
            [ "or", true, false, ... ] = true
            [ "not", true ] = false
            [ "in", stack, niddle ] = false
            [ "equal", "operand1", "operand2" ] = false
        Операнды:
            #abstract - исползуется абстракция pusa для
            элемента (рекомендуется)
                #id
                #type
                #class
                #content
                #value
            @attribute - используется атрибут dom элемента
            $property - используется свойство dom элемента
            value - возвращается прямое значение
        Вложенности:
            [ "or", [ "equal", "@id", "my" ], [ "equal", "#id", "MY" ]]
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

        /* функция излечения значения */
        const getVal = (operand) =>
        {
            if (typeof operand !== "string") return operand;
            const source =  operand.slice(1);
            switch(operand[0])
            {
                case "#": // абстракция
                    switch(source)
                    {
                        case "id":      return elem.id;
                        case "tag":     return elem.tagName;
                        case "class":   return elem.className;
                        case "content": return elem.innerText;
                        case "value":   return elem.value;
                        default:        return undefined;
                    }
                case "@": // атрибут
                    return elem.getAttribute( source );
                case "$": // свойство
                    return elem[ source ];
                default:  // прямое значение
                    return operand;
            }
        };

        switch(op)
        {
            case "equal":
            {
                const [left, right] = args;
                return getVal(left) == getVal(right);
            }
            case "in":
            {
                const [stack, needle] = args;
                return Array.isArray( stack ) && stack.includes( getVal( needle ));
            }
            case "not":
                return !this.filter(elem, args[0]);
            case "and":
                return args.every(sub => this.filter( elem, sub ));
            case "or":
                return args.some(sub => this.filter( elem, sub ));
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
        .body()
        .insert( "div", Pusa.INSERT_LAST )
        .setAttr([{ id: "pusa-indicator", class: "hide" }])
        .pop();
    }


    /*
        Обновление индикатора активных запросов
    */
    updateIndicator()
    {
        return this
        .push()
        .body()
        .children( [ "equal", "id", "pusa-indicator" ] )
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
        this.applyFocus([]);
        return this;
    }



    /*
        Загрузка в focus корнеого dom объекта
        Предыдущее состояние фоуса сбрасывается.
    */
    root()
    {
        this.applyFocus([ document.documentElement ]);
        return this;
    }



    /*
        Загрузка в focus контейнера видимого контента, в случае с DOM это body
        Предыдущее состояние фоуса сбрасывается.
    */
    body()
    {
        this.applyFocus([ document.body ]);
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
        operator = Pusa.FOCUS_SET
    )
    {
        let currentFocus = [ ...this.focus ];
        let result = [];
        for
        (
            let i = 0;
            currentFocus.length > 0 && (depth === 0 || i < depth);
            i++
        )
        {
            const nextFocus = [];
            for(let el of currentFocus)
            {
                const parent = el.parentElement;
                if
                (
                    !parent ||
                    parent === document.documentElement ||
                    nextFocus.includes(parent)
                ) continue;
                nextFocus.push(parent);
                const res = this.filter(parent, filter);
                if(res === null) return this; /* останавливаем весь обход */
                if(res && !result.includes(parent))
                    result.push(parent);
            }
            currentFocus = nextFocus;
            if(currentFocus.length === 0) break;
        }

        this.applyFocus(result, operator);
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
        operator = Pusa.FOCUS_SET
    )
    {
        let currentFocus = [ ...this.focus ];
        let resultBuffer = [];
        for(let i = 0; currentFocus.length > 0 && (depth === 0 || i < depth); i++)
        {
            const nextFocus = [];

            for(let el of currentFocus)
            {
                for(let child of Array.from(el.children))
                {
                    if( nextFocus.includes( child )) continue;
                    nextFocus.push( child );
                    const res = this.filter(child, filter);
                    if(res === null) return this;
                    if(res && !resultBuffer.includes(child))
                        resultBuffer.push(child);
                }
            }
            currentFocus = nextFocus;
            if(currentFocus.length === 0) break;
        }
        this.applyFocus(resultBuffer, operator);
        return this;
    }



    /*
        Сохранение текущего фокуса в стек
    */
    push()
    {
        this.focusStack.push([...this.focus]);
        return this;
    }



    /*
        Восстановление фокуса из стека
    */
    pop()
    {
        if( this.focusStack.length > 0 )
        {
            this.focus = this.focusStack.pop();
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
        tag = "div",
        /* location operator INSERT_*/
        loc = Pusa.INSERT_LAST,
        /* count - количество объектов */
        count = 1
    )
    {
        const created = [];
        this.focus.forEach
        (
            el =>
            {
                for (let i = 0; i < count; i++)
                {
                    const node = document.createElement( tag );
                    switch( loc )
                    {
                        case Pusa.INSERT_BEFORE:
                            el.parentNode.insertBefore( node, el );
                        break;
                        case Pusa.INSERT_AFTER:
                            el.parentNode.insertBefore( node, el.nextSibling );
                        break;
                        case Pusa.INSERT_FIRST:
                            el.insertBefore( node, el.firstChild );
                        break;
                        case Pusa.INSERT_LAST:
                            el.appendChild(node);
                        break;
                        case Pusa.INSERT_WRAP:
                            if( el.parentNode )
                            {
                                el.parentNode.insertBefore(node, el);
                                node.appendChild( el );
                            }
                        break;
                        default:
                            this.log
                            (
                                Pusa.LOG_ERROR,
                                "unknown-insert-location",
                                { loc, tag }
                            );
                            /* прекращаем всю вставку */
                            return this;
                    }
                    created.push(node);
                }
            }
        );

        this.applyFocus( created );
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
        let newFocus = [];
        for( let el of this.focus )
        {
            /* Получаем данные элемента из хранилища */
            const data = this.domStorage.get(el);

            /* Удаляем слушатель события, если есть */
            if(data?.handler && data?.type)
            {
                el.removeEventListener(data.type, data.handler);
            }

            /* Удаляем элемент из хранилища */
            this.domStorage.delete(el);

            /* Добавляем родителя элемента в новый фокус */
            if( el.parentNode && !newFocus.includes(el.parentNode) )
            {
                newFocus.push(el.parentNode);
            }

            /* Удаляем сам элемент из DOM */
            el.remove();
        }

        /* Применяем новый фокус */
        this.applyFocus(newFocus);
        return this;
    }



    /*
        Регистрация события
    */
    event
    (
        /* Идентификатор события */
        id,
        /*
            массив pusa директив для исполнения при срабатывании,
            если пустой, то вызов будет отправлен на сервер
        */
        directives,
        /* url или uri обработчика на серере */
        callback = null,
        /* данные вызывающей стороны, передаваемые в обработчик */
        data = null,
        /* интервал между срабатываниями события (мс), 0 - каждое событие */
        throttleMls = 0
    )
    {
        if( directives === null ) directives = [];

        const old = this.events[ id ];
        if( old )
        {
            /* Сброс периодического события если назначено командой start*/
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

        this.events[ id ] =
        {
            directives: directives,
            callback: callback,
            data: data,
            throttle: throttleMls,
            timer: null,
            lastEvent: null,
            timerThrottle: null
        };
        return this;
    }



    /*
        Привязывает событие event к обработчику DOM для всех элементов в фокусе
        Для каждого элемента применяет свой идентификатор события.
        Если id — массив, используется циклически.
    */
    domEvent
    (
        /* Тип DOM-события (click, input и т.д.) */
        type,
        /* Идентификатор события или массив идентификаторов */
        id
    )
    {
        const ids = Array.isArray(id) ? id : [id];
        const n = ids.length;

        this.focus.forEach
        (
            (el, i) =>
            {
                const eventId = ids[ i % n ];
                const stored = this.domStorage.get(el) || {};

                /* Снимаем старый обработчик того же типа */
                if(stored.handlers && stored.handlers[type])
                {
                    el.removeEventListener(type, stored.handlers[type]);
                }

                /* Создаем новый обработчик */
                const handler = (event) =>
                {
                    this.eventHandler( eventId, event, type );
                };

                el.addEventListener(type, handler);

                /* Обновляем только нужные ключи, сохраняя остальное */
                this.domStorage.set
                (
                    el,
                    {
                        ...stored,
                        handlers: { ...stored.handlers, [type]: handler },
                        eventId
                    }
                );
            }
        );

        return this;
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
        const evt = this.events[ id ];
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
                this.eventHandler( id, null, "timer" );
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
        const evt = this.events[ id ];
        if( evt )
        {
            clearInterval( evt.timer );
            evt.timer = null;
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
        /* окно направление target, blank, ... */
        target = "_blank"
    )
    {
        if( url )
        {
            window.open( url, target );
        }
        else
        {
            this.log( Pusa.LOG_WARNING, "open:url-not-found" );
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
    set
    (
        /* ключ лотка */
        key = null,
        /* устанавливаемое значение */
        value = null
    )
    {
        if( key !== null )
        {
            this.tray[ key ] = value;
        }
        return this;
    }



    /*
        Возврат значения трея на сервер
    */
    get
    (
        /* запрашиваемый ключ */
        key = null,
        /* данные вызывающей стороны */
        data = null,
        /* адрес обратного вызова */
        callback = null
    )
    {
        if( key !== null )
        {
            this.sendCommand
            (
                'tray-get',
                data,
                { key: key, value: this.tray[ key ] },
                callback
            );
        }
        return this;
    }



    /*
        Размещает значение из tray в буфер обмена
    */
    toClipboard
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
        Размещает значение буфера обмена в трее
    */
    async fromClipboard
    (
        /* имя ключа в лотке */
        key = null
    )
    {
        if( key !== null )
        {
            this.tray[ key ] = await navigator.clipboard.readText();
        }
        return this;
    }



    /*
        Установка атрибутов в фокусе
        Кортежи устанавливаются для каждого очередного элемента фокуса
        Если элементов в фокусе больше выполняется повтор
    */
    setAttr
    (
        /* Кортежи ключ значение { key: value, ... }, {...} */
        tupple = []
    )
    {
        if( tupple.length )
        {
            const n = tupple.length;
            this.focus.forEach
            (
                (el, i) =>
                {
                    const attrs = tupple[i % n];
                    for(const k in attrs)
                        el.setAttribute(k, attrs[k]);
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
        if( tupple.length )
        {
            const n = tupple.length;
            this.focus.forEach
            (
                ( el, i) =>
                {
                    const props = tupple[ i % n ];
                    for( const k in props )
                        el[k] = props[k];
                }
            );
        }
        return this;
    }



    /*
        Установка содержимого в фокусе
        Поддержка массивов контента и циклическое применение.
        Для каждого элемента в фокусе будет становлен очередной контент
        Может принимать строку или массив.
        - Строка: применяется ко всем элементам
        - Массив: циклическое применение по фокусу
        Всегда через innerHTML
    */
    setContent
    (
        /* Контент строка или массив строк контента для применения к фокусу */
        content
    )
    {
        const arr = Array.isArray( content ) ? content : [ content ];
        const n = arr.length;
        this.focus.forEach
        (
            (el, i) =>
            {
                el.innerHTML = n ? arr[ i % n ] : "";
            }
        );

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
            this.focus.forEach( ( el, i ) =>
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
            this.focus.forEach( ( el, i ) =>
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
    classInsert
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
    classRemove
    (
        /*
            id - идентификтаор создаваемого класса
        */
        arg
    )
    {
        return this;
    }




    /*
        Вызов метода для каждого фокусе
    */
    call
    (
        /* вызываемый метод */
        method,
        /* аргументы для метода */
        args = [],
        /* ключ в в трее в который будет размещен результат*/
        key
    )
    {
        for( let el of this.focus )
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
                default:        console.log( msg, detail );   break;
            }
        }

        /* Отправка на бэк */
        if( route[1] && origin !== "back" )
        {
            this.sendCommand
            (
                "log",
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
}


//
//
//loadResource({type, url, async = false})
//{
//    this.push()
//        .body().children([ "equal", "tag", "head" ])
//        .insert(type === "css" ? "link" : "script")
//        .setAttr(
//            type === "css"
//            ? [{rel:"stylesheet", href:url}]
//            : [{src:url, async:async}]
//        )
//    .pop();
//
//    return this;
//}
