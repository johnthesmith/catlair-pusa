<?php



namespace catlair;



/* Load web payload library */
require_once LIB . '/pusa/pusa_web.php';



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
            -> send
            (
                '/pusa-pages/switch_lang',
                [ 'lang-id' => '#id' ]
            )
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
        -> event( 'click', 'helloworld-click' );
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
        /* Example #1. Change content */
        -> body()
        -> childrenById( 'get-uuid' )
        -> action
        (
            'get-uuid',
            $this -> copy()
            -> send( '/pusa-pages/get_uuid' )
        )
        -> event( 'click', 'get-uuid' )
        /* Example #2. Clipboard */
        /* copy action */
        -> action
        (
            'copy',
            $this
            -> copy()
            -> copyToTray( 'source' )
            -> clipboardFromTray( 'source' )
            -> alert( 'copy' )
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
                -> send
                (
                    /* Вызываем метод paste */
                    '/pusa-pages/paste',
                    /* в аргумент clipboard кладем состояние лотка */
                    [ 'clipboard' => '*clipboard' ]
                )
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
        -> setPassive( true )

        -> event( 'click', [ 'copy', 'paste', 'clear' ])
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
}
