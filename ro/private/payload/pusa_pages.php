<?php



namespace catlair;



/* Load web payload library */
require_once LIB . '/pusa/pusa_web.php';
require_once LIB . '/core/validator.php';



/*
    Api class declaration
*/
class PusaPages extends PusaWeb
{
    /*
        Activate page
    */
    private function activate()
    {
        return $this
        -> body()
        -> config([ 'highlightFocus' => 'true' ])
        -> children([ 'in', 'lang', '#class' ])
        -> action
        (
            'switch_lang',
            $this -> copy()
            -> map([ 'lang-id' => '#id' ])
            -> post( '/pusa-pages/switch_lang' )
        )
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
        /* Apply context */
        $this
        -> getApp()
        -> getSession()
        -> set( 'context', $lang_id )
        ;

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
        /*
            Example #1. Change content
        */
        -> body()
        -> childrenById( 'get-uuid' )
        -> action
        (
            'get-uuid',
            $this -> copy()
            -> post( '/pusa-pages/get_uuid' )
        )
        -> event( 'click', 'get-uuid' )

        /*
            Example #2. Clipboard
        */
        /* copy action */
        -> action
        (
            'copy',
            $this
            -> copy()
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
                -> map([ 'clipboard' => '*clipboard' ])
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

        /*
            Example #3
            Mousemove
        */
        /* Установка текущего тротлинг */
        -> setTray( 'throttle', 300 )
        /* Определение действия перемещения мыши по полю */
        -> action
        (
            'example-3-action',
            $this -> copy()
            -> map([ 'x' => '&offsetX', 'y' => '&offsetY' ])
            -> post( '/pusa-pages/mouse-move' ),
            '*throttle'
        )
        /* Определение действия при изменении значения тротлинга */
        -> action
        (
            'change-throttle',
            $this -> copy()
            -> setTray( 'throttle', '#value' )
            -> body()
            -> childrenById( 'throttleValue' )
            -> setValue( '*throttle' )
        )
        /* Установка события перемещения мыши по полю */
        -> body()
        -> childrenById( 'example-3-box' )
        -> event( 'mousemove', 'example-3-action' )
        /* Установка дейсвтия изменения тротлинга */
        -> body()
        -> childrenById( 'throttle' )
        -> setValue( '*throttle' )
        -> event( 'input', 'change-throttle' )

        -> body()
        -> childrenById( 'throttleValue' )
        -> setValue( '*throttle' )
        /* Example #4 */
        /* Действие отправки формы и создания новой записи*/
        -> action
        (
            'send-form',
            $this -> copy()
            -> body()
            -> childrenById( 'order-form' )
            -> form()
            -> map
            (
                [
                    'product' => '^product',
                    'quantity' => '^quantity',
                    'price' => '^price'
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
        /* Example #5 */
        /* Создание действий */
        -> action( 'focus-body', $this -> copy() -> body() )
        -> action
        (
            'focus-siblings',
            $this -> copy() -> grab() -> parent() -> children( true )
        )
        -> action( 'focus-this', $this -> copy() -> grab() )
        -> action( 'focus-parent', $this -> copy() -> grab() -> parent())
        -> action( 'focus-grandparent', $this -> copy() -> grab() -> parent( 2 ))
        -> action
        (
            'focus-p',
            $this -> copy()
            -> body()
            -> children([ 'equal', 'p', '#type'])
        )

        -> body()
        -> childrenById( 'focus-battons' )

        -> childrenById( 'focus-body' )
        -> event( 'click', 'focus-body' )

        -> parent()
        -> childrenById( 'focus-siblings' )
        -> event( 'click', 'focus-siblings' )

        -> parent()
        -> childrenById( 'focus-this' )
        -> event( 'click', 'focus-this' )

        -> parent()
        -> childrenById( 'focus-parent' )
        -> event( 'click', 'focus-parent' )

        -> parent()
        -> childrenById( 'focus-grandparent' )
        -> event( 'click', 'focus-grandparent' )

        -> parent()
        -> childrenById( 'focus-p' )
        -> event( 'click', 'focus-p' )

        /* Example #6 */
        -> action
        (
            'phone-validate',
            $this -> copy()
            -> map([ 'value' => '#value' ])
            -> post( '/pusa-pages/phone-validate' ),
            500
        )

//        -> action
//        (
//            'moment-validate',
//            $this -> copy()
//            -> map([ 'value' => '#value' ])
//            -> post( '/pusa-pages/moment-validate' )
//        )

        -> body()
        -> childrenById( 'phone' )
        -> event( 'input', 'phone-validate' )

//        -> body()
//        -> childrenById( 'moment' )
//        -> event( 'input', 'moment-validate' )

        -> clear()
        ;
    }



    /*
        Example #1 handler
        Set uuid
    */
    public function get_uuid()
    {
        $this
        -> body()
        -> childrenById( 'uuid' )
        -> setValue([ clUuid() ])
        ;
    }



    /*
        Example #2 paste in to textarea
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



    /*
        Example #3 mousemove
    */
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



    /*
        Example #4 form processing
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
        -> insert( 'table-record.html', self::INSERT_FIRST )
        -> childrenByClass( 'value' )
        -> setValue([ cluuid(), $product, $quantity, $price, $price * $quantity ])
        -> parentsByClass( 'record' )
        -> childrenByClass( 'delete' )
        -> event( 'click', 'delete-record' )
        ;
        return $this;
    }




    public function phone_validate
    (
        string $value = null
    )
    {
        $result = Validator::phone( $value );
        return $this
        -> body()
        -> childrenById( 'phone' )
        -> setValue( $result[ 'formatted' ] )
        -> parent()
        -> childrenById( 'country' )
        -> setValue( $result[ 'country' ])
        ;
    }



    public function moment_validate
    (
        string $value = null
    )
    {
        $result = Validator::moment( $value );
        return $this
        -> body()
        -> childrenById( 'moment' )
        -> setValue( $result )
        ;
    }
}
