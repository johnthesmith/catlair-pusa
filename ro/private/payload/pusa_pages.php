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
        Build Helloworld full content
    */
    public function helloworld()
    {
        return $this
        -> makeContent( 'helloworld.html', 'Pusa - helloworld' )
        ;
    }



    /*
        Build Intro page
    */
    public function intro()
    {
        return $this
        -> makeContent( 'intro.html', 'Pusa - intro' )
        ;
    }



    /*
        Build Intro page
    */
    public function example()
    {
        return $this
        -> makeContent( 'example.html', 'Pusa - example' )
        ;
    }


}
