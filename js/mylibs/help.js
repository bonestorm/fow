
define(['base'],function(BASE){

  
    return function(globs){

        // Add the Help class

        var _globs = globs; 
        var _context = _globs.context;

        var help_text_obj;//id of the text added through text_overlay
        var dismiss_text_obj;//id of the text for the dismiss button

        var _handler_id = "DBFlyer.help";//id to use for the handler so it can identify this object for user input
        
        // the object we're encapsulating
        var OBJ = {
          tx: 0, ty: 0//the top left corner of the help.  it's for translation.  updated on window resize
        };
        
        var help_text = "\
\
<p>DBFlyer Help\
\
<p>1. You can always bring up this help by typing 'h' or '?'\
<p>2. Type 'm' to bring up the editing menu. This will give you all editing options.  Type 'm' again to dismiss the menu or click the close 'x' on the menu.\
<p>3. Double \
<p>1. You can always bring up this help by typing 'h' or '?'\
\
\
\
\
\
\
";

        
        var dismiss_height = 16;
        
        var box = {x:-(500/2),y:0,width:500,height:500};
        var text_box = $.extend({},box);text_box.height -= dismiss_height+10;


        var dismiss = {x:box.x+20,y:box.y+box.height-20-16,width:box.width-20-20,height:dismiss_height};
        var close = {x:box.x+box.width,y:box.y,radius: 16};

        //all text overlays are in relation to top middle
        OBJ.resize = function(){
          OBJ.tx = _globs.border+_globs.margin.x+_globs.width/2;
          OBJ.ty = _globs.border+_globs.margin.y;
          _globs.text_overlay.translate(OBJ.tx,OBJ.ty);
        }
        
        OBJ.start_help = function(){//give outsiders the option to start the help screen
          
          if(OBJ.active == undefined || !OBJ.active) {
          
            OBJ.active = true;
            add_click_handler();
            _globs.input.exclusive(_handler_id,true);

            //all text overlays are in relation to top middle
            OBJ.resize();

            help_text_obj = _globs.text_overlay.add_text(
              help_text,
              text_box.x+20,
              text_box.y+20,
              text_box.width-40,text_box.height-40
            );
            help_text_obj.div.addClass("help_text");
            
            dismiss_text_obj = _globs.text_overlay.add_text(
              "dismiss help for good",
              dismiss.x,dismiss.y,dismiss.width,dismiss.height
            );
            dismiss_text_obj.div.addClass("help_text");
            dismiss_text_obj.div.css('text-align', 'center');
            
            if(_globs.refresh != undefined){_globs.refresh();}
            
          }
          
        }
        

        if($.cookie("DBFlyer_helped")) {
          OBJ.active = false;
        } else {
          OBJ.start_help();
        } 
        
        function stop_help(){
        
          OBJ.active = false;
          _globs.input.exclusive(_handler_id,false);
          remove_click_handler();
          
          if(help_text_obj != undefined)
            _globs.text_overlay.delete_text(help_text_obj.div_id);
          if(dismiss_text_obj != undefined)
            _globs.text_overlay.delete_text(dismiss_text_obj.div_id);
          _globs.refresh();
        }
        
        //click handler is to detect if the user closes the help text
        function click_handler(){
        
          var ix = _globs.input.x()-_globs.width/2;
          var iy = _globs.input.y();

          if(//if it is dismissed then turn it off forever
            (ix >= dismiss.x && ix < (dismiss.x+dismiss.width)) &&
            (iy >= dismiss.y && iy < (dismiss.y+dismiss.height))
          ){
            $.cookie('DBFlyer_helped', 'TRUE');//turn off helping for good
            stop_help();
            return;
          }
          
          if(//if it is just closed then bug them again in a day
            Math.sqrt((ix-close.x)*(ix-close.x)+(iy-close.y)*(iy-close.y))
            <= close.radius
          ){
            $.cookie('DBFlyer_helped', 'TRUE', { expires: 1 });//turn off helping for a day
            stop_help();
            return;
          }
          
        }

        function move_handler(){

        }      
        function add_click_handler(){     
          _globs.input.add_mouseup_handler(_handler_id,3,click_handler);
          _globs.input.add_move_handler(_handler_id,3,move_handler);
          _globs.input.exclusive(_handler_id,true);
        }
        
        //get the close icon image
        var close_image = new Image();
        close_image.src = "img/close.png";
        close_image.onload = function(){_globs.refresh();}
          
        OBJ.draw = function (){
        
          //surround the whole canvas with a border
          /*
          _globs.context.strokeStyle = "#000000";
          _globs.context.lineWidth = .5;
          _globs.context.strokeRect(0.5,0.5,globs.width-1,_globs.height-1); 
          */

          _globs.context.save();
          _globs.context.setTransform(1,0,0,1,OBJ.tx,OBJ.ty);//simple translation

          //put a border around the help text
          _globs.context.globalAlpha = 1.0;
          _globs.context.strokeStyle = "#000000";
          _globs.context.fillStyle = "#ffffff";
          _globs.context.lineWidth = 1.5;
          BASE.roundRect(_globs.context,box.x+0.5,box.y+0.5,box.width,box.height,20);
          _globs.context.fill();
          _globs.context.stroke();
          
          if(close_image.complete){
            //put a close image to the top right
            _globs.context.globalAlpha = 1.0;
            _globs.context.drawImage(close_image,close.x-15,close.y-15);
          }
          
          //pus a dismiss button on the bottom of the help text
          _globs.context.globalAlpha = 1.0;
          _globs.context.lineWidth = 0.5;
          BASE.roundRect(_globs.context,dismiss.x+0.5,dismiss.y+0.5,dismiss.width,dismiss.height,5);
          _globs.context.stroke();

          _globs.context.restore();

        }
        
        function remove_click_handler(){
          _globs.input.remove_mouseup_handler(_handler_id);
          _globs.input.remove_move_handler(_handler_id);
        }

        
        return OBJ;

    };

});
