<?php
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



namespace catlair;



/* Load web payload library */
require_once LIB . '/pusa/pusa_win.php';
require_once LIB . '/core/validator.php';



/*
    Api class declaration
*/
class PusaPages extends PusaWin
{
    /*
        Activate page
    */
    private function activate()
    {
        return $this
        -> body()
        -> config([ 'highlightTrap' => 'true' ])
        -> addCss( '/content/make/css/win.css', 'win-css' )
        -> action
        (
            'switch_lang',
            $this -> copy()
            -> map([ 'lang-id' => 'actor|id' ])
            -> post( '/pusa-pages/switch_lang' )
        )
        -> body()
        -> childrenByClass( 'lang' )
        -> event( 'click', 'switch_lang' )
        ;
    }


    /* Switch language
    */
    public function switch_lang
    (
        string $lang_id = ''
    )
    {
        /* Apply langiage context */
        $this
        -> getApp()
        -> getSession()
        -> set( 'context', $lang_id )
        ;
        /* Send directives */
        return $this
        -> log( 'info', $lang_id )
        -> open()
        ;
    }



    /*
        Build Helloworld full content
    */
    public function helloworld()
    {
        return $this
        -> makeContent( 'helloworld.html', 'Pusa - helloworld' )
        -> activate()
        -> action
        (
            'helloworld-click',
            $this -> copy() -> alert( 'Hello World' )
        )
        -> body()
        -> childrenById( 'helloworld' )
        -> event( 'click', 'helloworld-click' )
        -> clear()
        ;
    }



    /*
        Build Intro page
    */
    public function intro()
    {
        return $this
        -> activate()
        -> makeContent( 'intro.html', 'Pusa - intro' )
        -> clear()
        ;
    }



    /*
        Build Intro page
    */
    public function example()
    {
        return $this
        -> activate()
        -> makeContent( 'example.html', 'Pusa - example' )

        /* Инициализация примеров */
        -> example1()
        -> example2()
        -> example3()
        -> example4()
        -> example5()
        -> example6()
        -> example7()
        -> example8()
        -> example9()
        -> example10()
        ;
    }



    /**************************************************************************
        Example #1. Change content in element
    */

    /*
        Prepare actions for example 1
    */
    private function example1()
    {
        return $this
        -> body()
        -> childrenById( 'get-uuid' )
        -> action
        (
            'get-uuid',
            $this -> copy()
            -> post( '/pusa-pages/get_uuid' )
        )
        -> event( 'click', 'get-uuid' )
        ;
    }



    /*
        Handler Set uuid
    */
    public function get_uuid()
    {
        $this
        -> body()
        -> childrenById( 'uuid' )
        -> setValue([ clUuid() ])
        ;
    }



    /**************************************************************************
        Example #2. Clipboard
    */

    /*
        Preapre directives
    */
    private function example2()
    {
        return $this
        /* copy action */
        -> action
        (
            'copy',
            $this -> copy()
            -> copyToTray( 'source' )
            -> clipboardFromTray( 'source' )
        )
        /* paste action  */
        -> action
        (
            'paste',
            $this
            -> copy()
            -> clipboardToTray
            (
                'clipboard',
                $this -> copy()
                /* в аргумент clipboard кладем состояние лотка */
                -> map([ 'clipboard' => 'tray|clipboard' ])
                /* Вызываем метод paste */
                -> post( '/pusa-pages/paste' )
            )
        )
        /* clear action  */
        -> action
        (
            'clear',
            $this
            -> copy()
            -> body()
            -> childrenById( 'clipboard-source' )
            -> setValue([ '' ])
        )
        -> body()
        -> childrenById( 'copypaste' )
        -> children( true, 1 )
        -> event( 'click', [ 'copy', 'paste', 'clear' ])
        ;
    }



    /*
        Paste in to textarea
    */
    public function paste
    (
        string $clipboard = ''
    )
    {
        return $this
        -> body()
        -> childrenById( 'clipboard-source' )
        -> setValue([ 'backend: ' . $clipboard ])
        ;
    }



    /**************************************************************************
        Example #3 mousemove
    */
    private function example3()
    {
        return $this
        /* Установка текущего тротлинг */
        -> setTray( 'throttle', 300 )
        /* Определение действия перемещения мыши по полю */
        -> action
        (
            'example-3-action',
            $this -> copy()
            -> map([ 'x' => 'event|offsetX', 'y' => 'event|offsetY' ])
            -> post( '/pusa-pages/mouse-move' ),
            'tray|throttle'
        )
        /* Определение действия при изменении значения тротлинга */
        -> action
        (
            'change-throttle',
            $this -> copy()
            -> setTray( 'throttle', 'actor|value' )
            -> body()
            -> childrenById( 'throttleValue' )
            -> setValue( 'tray|throttle' )
        )
        /* Установка события перемещения мыши по полю */
        -> body()
        -> childrenById( 'example-3-box' )
        -> event( 'mousemove', 'example-3-action' )
        /* Установка дейсвтия изменения тротлинга */
        -> body()
        -> childrenById( 'throttle' )
        -> setValue( 'tray|throttle' )
        -> event( 'input', 'change-throttle' )

        -> body()
        -> childrenById( 'throttleValue' )
        -> setValue( 'tray|throttle' )
        ;
    }



    public function mouse_move
    (
        $x = 0,
        $y = 0
    )
    {
        return $this
        -> body()
        -> childrenById( 'example-3-box' )
        -> setValue([ 'backend: ' . $x . ':' . $y ])
        ;
    }



    /**************************************************************************
        Example #4. Form
    */

    /* Example #4 */
    private function example4()
    {
        return $this
        -> action
        (
            'send-form',
            $this -> copy()
            -> body()
            -> childrenById( 'order-form' )
            -> map
            (
                [
                    'product'   => 'trap|product|form',
                    'quantity'  => 'trap|quantity|form',
                    'price'     => 'trap|price|form'
                ]
            )
            -> post( '/pusa-pages/post-form' )
        )
        /* Действие удаления записи */
        -> action
        (
            'delete-record',
            $this -> copy()
            -> grab()
            -> parentsByClass( 'record' )
            -> remove()
        )
        /* Навеска события на кнопку отрпака формы добавления записи */
        -> body()
        -> childrenById( 'order-form' )
        -> childrenByClass( 'submith' )
        -> event( 'click', 'send-form' )
        ;
    }



    /*
        Form processing
    */
    public function post_form
    (
        string | null $product = null,
        float $quantity = 0,
        float $price = 0
    )
    {

        $this
        -> body()
        -> childrenById( 'table' )
        -> insert
        (
            'table-record.html',
            [
                'id' => cluuid(),
                'product' => $product,
                'quantity' => $quantity,
                'price' => $price,
                'total' => $price * $quantity
            ],
            self::INSERT_FIRST
        )
        /* Устанавливаем действие удаления */
        -> childrenByClass( 'delete' )
        -> event( 'click', 'delete-record' )
        ;
        return $this;
    }



    /**************************************************************************
        Example #5. Trap
    */

    /* Example #4 */
    private function example5()
    {
        return $this

        /* Example #5 */
        /* Создание действий */
        -> action( 'trap-body', $this -> copy() -> body() )
        -> action
        (
            'trap-siblings',
            $this -> copy() -> grab() -> parent() -> children( true )
        )
        -> action( 'trap-this', $this -> copy() -> grab() )
        -> action( 'trap-parent', $this -> copy() -> grab() -> parent())
        -> action( 'trap-grandparent', $this -> copy() -> grab() -> parent( 2 ))
        -> action
        (
            'trap-p',
            $this -> copy()
            -> body()
            -> children([ 'equal', 'p', 'item|type'])

        )
        -> action( 'dump', $this -> copy() -> dump() )

        -> body()
        -> childrenById( 'trap-battons' )

        -> childrenById( 'trap-body' )
        -> event( 'click', 'trap-body' )

        -> parent()
        -> childrenById( 'trap-siblings' )
        -> event( 'click', 'trap-siblings' )

        -> parent()
        -> childrenById( 'trap-this' )
        -> event( 'click', 'trap-this' )

        -> parent()
        -> childrenById( 'trap-parent' )
        -> event( 'click', 'trap-parent' )

        -> parent()
        -> childrenById( 'trap-grandparent' )
        -> event( 'click', 'trap-grandparent' )

        -> parent()
        -> childrenById( 'trap-p' )
        -> event( 'click', 'trap-p' )

        -> parent()
        -> childrenById( 'dump' )
        -> event( 'click', 'dump' )
        ;
    }



    /**************************************************************************
        Example #6. Validate
    */
    private function example6()
    {
        return $this
        -> action
        (
            'phone-validate',
            $this -> copy()
            -> map([ 'value' => 'actor|value' ])
            -> post( '/pusa-pages/phone-validate' ),
            500
        )
        -> body()
        -> childrenById( 'phone' )
        -> event( 'input', 'phone-validate' )
        ;
    }



    /*
        Validate phone input
    */
    public function phone_validate
    (
        string $value = null
    )
    {
        /* Input valudation */
        $result = Validator::phone( $value );
        return $this
        -> body()
        /* Change phone */
        -> childrenById( 'phone' )
        -> setValue( $result[ 'formatted' ] )
        /* Change country */
        -> parent()
        -> childrenById( 'country' )
        -> setValue( $result[ 'country' ])
        ;
    }



    /**************************************************************************
        Example #7. Validate
    */
    private function example7()
    {
        return $this
        /* Example #7 */
        -> action
        (
            'scroll-to-uuid',
            $this -> copy()
            -> body()
            -> childrenById( 'uuid' )
            -> addClasses([[ 'scroll-margin-top' ]])
            -> view( true )
        )
        -> action
        (
            'scroll-top',
            $this -> copy()
            -> root()
            -> scroll( 0, 0, true )
        )
        -> body()
        -> childrenByClass( 'example7' )
        -> event( 'click', [ 'scroll-to-uuid', 'scroll-top' ])
        ;
    }



    /**************************************************************************
        Example #8. Validate
    */
    private function example8()
    {
        return $this
        -> action
        (
            'scroll-field',
            $this -> copy()
            -> body()
            -> childrenById( 'scroll-field' )
            -> map
            (
                [
                    'scroll_top' => 'trap|scrollTop|prop',
                    'scroll_height' => 'trap|scrollHeight|prop',
                    'client_height' => 'trap|clientHeight|prop'
                ]
            )
            -> post( '/pusa-pages/scroll-image-list' ),
            500
        )
        -> body( )
        -> childrenById( 'scroll-field' )
        -> event( 'scroll', 'scroll-field' )
        -> trigger( true, 'scroll-field' )
        ;
    }




    public function scroll_image_list
    (
        int $scroll_top = 0,
        int $scroll_height = 0,
        int $client_height = 0
    )
    {
        $threshold = 0.1 * $client_height;
        if
        (
            $scroll_top + $client_height >= $scroll_height - $threshold
        )
        {
            $this
            -> body()
            -> childrenById( 'scroll-field' )
            -> insert( 'image-record.html', [], self::INSERT_LAST )
            -> setAttr([ 'src' => 'https://picsum.photos/300?random=2&a=' . clUuid()  ])
            -> parent()
            -> trigger( true, 'scroll-field' )
            ;
        }
        return $this;
    }



    /**************************************************************************
        Example #9. Timers
    */
    private function example9()
    {
        /* Example #9 */
        return $this
        -> action
        (
            'timer-action',
            $this -> copy()
            -> body()
            -> childrenById( 'timer-indicator' )
            -> map([ 'value' => 'trap|value' ])
            -> post( '/pusa-pages/timer-action' )
        )
        -> action
        (
            'timer-start',
            $this -> copy()
            -> start( 'timer-action', 400 )
        )
        -> action
        (
            'timer-stop',
            $this -> copy()
            -> stop( 'timer-action' )
        )
        -> body()
        -> childrenById( 'timer-start' )
        -> event( 'click', 'timer-start' )
        -> parent()
        -> childrenById( 'timer-stop' )
        -> event( 'click', 'timer-stop' )
        ;
    }



    /*
        Timer glukalo
    */
    public function timer_action
    (
        string $value = '',
    )
    {
        return $this
        -> body()
        -> childrenById( 'timer-indicator' )
        -> setValue
        (
            mb_substr
            (
                $value .
                [ "▁","▂","▃","▄","▅","▆","▇","█" ]
                [
                    (int)( ( sin( microtime(true) * 2 ) + 1) / 2 * 7 )
                ],
                -20
            )
        )
        ;
    }



    /**************************************************************************
        Example #10. Validate
    */
    private function example10()
    {
        /* Example #9 */
        return $this
        -> action
        (
            'example10-dialog',
            $this -> copy()
            -> winDialog()
            -> setValue( 'Hello world! I am a dialog window.' )
        )
        -> action
        (
            'example10-popup',
            $this -> copy()
            -> winPopup()
            -> setValue( 'Hello world! I am a popup window.' )
            -> parentsByClass( 'win-popup', 0 )
            -> align()
        )

        -> body()
        -> childrenByClass( 'example10' )
        -> event( 'click', [ 'example10-dialog', 'example10-popup' ])
        ;
    }
}

