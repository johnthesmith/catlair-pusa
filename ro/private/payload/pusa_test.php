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
class PusaTest extends Pusa
{
    /*
        Default content
    */
    public function go()
    {
        $this -> debug() -> js( 'aaa' ) -> dumpCommands();
    }
}
