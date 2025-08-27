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
//        $this -> debug() -> js( 'aaa' ) -> dumpCommands();
    }
}
