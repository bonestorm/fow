
define(function(){

    return function(globs){

        var _globs = globs;

        var OBJ = {};

        //main handles getting key pressed from the user
        //for high level functions
        function keydown_handler(e){
        
          OBJ.shiftKey = e.shiftKey;//keep the status of the shift key in main
          OBJ.ctrlKey = e.ctrlKey;
          OBJ.altKey = e.altKey;
          //log("keydown, shift:"+OBJ.shiftKey+" ctrl:"+OBJ.ctrlKey+" alt:"+OBJ.altKey);
          
          if(e.keyCode == 27){//escape, to unselect everything
            _globs.grid.clear_selected();
            _globs.refresh();
          }
          
          if(e.keyCode == 46){//delete, delete selected objects
            _globs.grid.delete_selected();
            _globs.refresh();
          }
          
          if(e.keyCode == 71){//'g' for toggle showing the grid
            _globs.grid.show_grid = (_globs.grid.show_grid ? false : true);
            _globs.refresh();
            return;
          }
          
          if(e.keyCode == 72 || (e.shiftKey && e.keyCode == 191)){//'h' or '?'
            _help.start_help();
            return;
          }

          if(e.keyCode == 77){//'m' for map
            return;
          }
          //if(e.keyCode = 69){//'e' for excelsior
          if(e.keyCode == 81){//'q' for query
            return;
          }
          
        }
        
        function keyup_handler(e){
          OBJ.shiftKey = e.shiftKey;
          OBJ.ctrlKey = e.ctrlKey;
          OBJ.altKey = e.altKey;
          //log("keyup, shift:"+OBJ.shiftKey+" ctrl:"+OBJ.ctrlKey+" alt:"+OBJ.altKey);
        }
        
        //bind the keyboard handler
        $(document).bind("keydown.NAMESPACE",keydown_handler);
        $(document).bind("keyup.NAMESPACE",keyup_handler);

        //disable right click menu
        $(document).bind("contextmenu", function(e) {
          if(!_globs.grid.is_out_of_bounds(e.pageX,e.pagetY)){
            e.preventDefault();
          }
        });

        return OBJ;

    };

});
