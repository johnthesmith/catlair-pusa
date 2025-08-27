/*
    Модуль инстанцирования pusa
    Подключение модуля должно быть осуществлено строго с defer
    после загрузки pusa:
        <script src="./pusa.js" defer></script>
        <script src="./pusa-create.js" defer></script>
*/
window.pusa = Pusa.create( "/pusa-web/init" );

//
//
//pusa.exec
//([
//    [ "config", { highlightFocus: true }],
//    [ "title", "test" ],
//
//    [ "body" ],
//    [ "insert", "div", "last", 3 ],
//    [ "setAttr", [ { id:"top" }, { id:"page" }, { id:"bottom" } ] ],
//    [ "addClasses", [ [ "top" ], [ "page" ], [ "bottom" ] ] ],
//    [ "setContent", [ "Pusa", "hello", "2025" ] ],
//
//    /* Декларация событий*/
//    [
//        "event",
//        "stop",
//        [
//            [ "log", "info", "start" ],
//            [ "stop", "add-cross" ],
//            [ "body" ],
//            [ "children", ["equal", "$id", "button" ]],
//            [ "remove" ]
//        ]
//    ],
//    [
//        "event",
//        "open",
//        [
//            [ "log", "info", "open" ],
//            [ "open", "https://google.com" ]
//        ]
//    ],
//
//    /* Создание кнопок */
//    [ "body" ],
//    [ "children", [ "equal", "$id", "page" ] ],
//    [ "insert", "button", "last", 2 ],
//    [ "setAttr", [ { id:"button" }, { id:"open" } ] ],
//    [ "setContent", [ "stop", "open" ] ],
//    /* Привязка событий к кнопке */
//    [ "domEvent", "click", [ "stop", "open" ] ],
//
//    /* Декларация события таймера */
//    [
//        "event",
//        "add-cross",
//        [
//            [ "body" ],
//            [ "children", [ "equal", "$id", "bottom" ]],
//            [ "insert" ],
//            [ "setContent", [ "x" ]]
//        ]
//    ],
//    /* Запуск таймера */
//    [ "start", "add-cross", 1000 ]
//]);
