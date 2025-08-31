<?php



namespace catlair;



/* Load web payload library */
require_once LIB . '/pusa/pusa_web.php';



/*
    Api class declaration
*/
class PusaPages extends PusaWeb
{
    private function activate()
    {
        return $this
        -> body()
        -> children([ 'in', 'lang', '#class' ])
        -> action
        (
            'lang',
            null,
            '/pusa-pages/lang',
            [ 'type' => '&type', 'lang_id' => '#id' ]
        )
        -> event( 'click', 'lang' )
        ;
    }


    public function lang( $lang_id )
    {
        return $this
        -> log( 'info', $this->getApp()->getParams() )
        -> log( 'info', $lang_id )
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
