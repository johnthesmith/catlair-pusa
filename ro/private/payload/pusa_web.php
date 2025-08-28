<?php
/*
    Default payload api
*/


namespace catlair;



/* Load web payload library */
require_once LIB . '/pusa/pusa.php';



/*
    Api class declaration
*/
class PusaWeb extends Pusa
{
    /*
        Default content
    */
    public function init()
    {
        $this
        /* Базовое конфигурироваение fe*/
        -> config([ 'highlightFocus' => true ])
        -> title( 'Pusa framework' )

        /* Сборка базового контента */
        -> body()
        -> setText()
        -> insert( 'div', 'last', 3 )
        -> setAttr
        (
            [
                [ 'id' => 'top' ],
                [ 'id' => 'page' ],
                [ 'id' => 'bottom' ]
            ]
        )
        -> addClasses([ [ 'top' ], [ 'page' ], [ 'bottom' ] ])
        -> setText([ 'Pusa', 'hello', '2025' ])

        /* Декларация событий */
        -> event
        (
            "stop",
            $this -> copy()
            -> log( 'info', 'start' )
            -> stop( 'add-cross' )
            -> body()
            -> children([ 'equal', '$id', 'button' ])
            -> remove()
        )
        -> event
        (
            "open",
            $this -> copy()
            -> log( 'info', 'open')
            -> open( 'https://google.com')
        )

        /* Создание кнопок */
        -> body()
        -> children([ 'equal', '$id', 'page' ])
        -> insert( 'button', 'last', 2)
        -> setAttr([ [ 'id' => 'button' ], [ 'id' => 'open' ] ])
        -> setText([ 'stop', 'open' ])
        /* Привязка событий к кнопке */
        -> domEvent( 'click', [ 'stop', 'open' ])

        /* Декларация события таймера */
        -> event
        (
            "add-cross",
            $this -> copy()
            -> body()
            -> children([ 'equal', '$id', 'bottom' ])
            -> insert()
            -> setContent([ "x" ])
        )

        /* Запуск таймера */
        -> start("add-cross", 1000)
        ;
    }
}
