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
        -> children([ 'in', 'lang', '#class' ])
        -> action
        (
            'switch_lang',
            null,
            '/pusa-pages/switch_lang',
            [
                'type' => '&type',
                'lang-id' => '#id'
            ]
        )
        -> event( 'click', 'switch_lang' )
        ;
    }



    /*
        Switch language
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
        -> set( 'context', $lang_id );

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
            $this -> copy()
            -> alert( 'Hello World' )
        )
        -> body()
        -> children( [ 'equal', '#id', 'helloworld' ])
        -> event( 'click', 'helloworld-click', [], [ 'id' => 'idLang'] );
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
        ;
    }
}
