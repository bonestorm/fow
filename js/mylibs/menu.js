
define(['base'],function(BASE){


    return function(globs){
      
        var _globs = globs; 
        var _context = _globs.context;

        //holds calculated value of the location of the menu in pixel coordinates
        var _shown_x,_shown_y;
        
        var _font_height = 11;

        var _reverse_options = false;//whether to show the options above or below the hook.  true means below.
        
        // the object we're encapsulating
        var OBJ = {
          display: false,
          hooks: [],new_hooks: [],//hooks is current hooks, new_hooks is set to have grid refresh hooks, grid will move new_hooks to hooks
          selected: false,   

          //how the grid treats this kind of object
          grid_behavior: {selectable: false,box_selectable: false,draggable: false,unselectable: true},
       
          active: false,//whether it's interactable on a grid level

          z:3//be drawn after links and tables
        };
        
        var _handler_id = "DBFlyer.menu";//id to use for the handler so it can identify this object for user input

        //you could have multiple lists of options maybe for different contexts
        var options = [//first option here is shown closest to the cursor
          {id: 'new_join',shown: 'place a table join'},
          //{id: 'new_table',shown: 'place a table'},
          //{id: 'new_key_constraint',shown: 'create a key constraint'},
          //{id: 'query_composer',shown: 'query composer'},
          //{id: 'settings',shown: 'edit settings'},//change settings for database connection
          //{id: 'import',shown: 'import schema'},//import the schema from a database
          
        ];

        
        /*
        function add_click_handler(){     
          _globs.input.add_mouseup_handler(_handler_id,click_handler);
          _globs.input.exclusive(_handler_id,true);
        }
        function remove_click_handler(){
          _globs.input.remove_mouseup_handler(_handler_id);
        }
        */
        function get_shown_position(window){
          var half_cell = _globs.cell_size/2;
          _shown_x = (OBJ.cx-window.x*4)*_globs.cell_size+half_cell;
          _shown_y = (OBJ.cy-window.y*4)*_globs.cell_size+half_cell;
        }

        
        //other objects can set their functions as handlers for when a menu item (option) is picked
        var handlers = [];
        OBJ.add_handler = function(option,handler){
          handlers[option] = handler;
        }
        //no real need to remove the handler

        function set_hooks(cx,cy,hooks){
          if(hooks === undefined){hooks = OBJ.hooks;}

          hooks.push({cx: cx,cy: cy, obj: OBJ});
          return true;
        }
        
        function delete_text_overlays(){
            //delete all the text overlays
            for(var opt_ind in options){
              var opt = options[opt_ind];
              if(opt.text_id != undefined){
                _globs.text_overlay.delete_text(opt.text_id);
                delete opt.text_id;
              }
            }

        }
        
        OBJ.type = function(){return "menu";}


        var _selected_cell = {};
        var _option_boxes = [];//array of boxes for detecting is a mouse click hit one
        var _box = {x:0,y:0,width:0,height:0};//box around all options
        
        OBJ.toggle_menu = function(cx,cy){
          
          if(OBJ.display){
          
            //remove_click_handler();
            
            //delete_text_overlays();
            
            //let grid know it should be deleted
            OBJ.display = false;
            
          } else {

            //add_click_handler();
            
            var half_cell = _globs.cell_size/2;
          
            //give this menu a position

            OBJ.cx = cx;
            OBJ.cy = cy;
            
            set_hooks(OBJ.cx,OBJ.cy)
            //log('hooks added');

            //display is on
            OBJ.display = true;
            
          }
          _globs.refresh();
        }

        function set_option_boxes(){
        
          //delete_text_overlays();
          
          var half_cell = _globs.cell_size/2;

          //compute the size of the box to contain all the options
          var opt_spacing = 2;
          var box_height = 14;
          _globs.context.font = _font_height+"px Verdana";
          
          var opt_width = 0;
          var opt_height = 0;
          for(var opt_id in options){
            var opt = options[opt_id];
            var metrics = _globs.context.measureText(opt.shown);
            if(opt_width < metrics.width) opt_width = metrics.width;
            opt_height += box_height+opt_spacing;
          }
          opt_height += opt_spacing;//one more for bottom spacing
          opt_width += opt_spacing*2;
         
         
          var opt_dims = {
            x: -opt_width/2, y: -(opt_height+half_cell),
            width: opt_width, height: opt_height
          };
          
          
          _box.x = opt_dims.x;_box.y = opt_dims.y;
          _box.width = opt_dims.width;_box.height = opt_dims.height;
          
         
          //top of the menu will get cut off so but it below
          _reverse_options = false;
          if(_shown_y+opt_dims.y < 0){//-(_globs.margin.y+_globs.border)){
            opt_dims.y = half_cell;
            _reverse_options = true;
          }
          
          var options_order = [];
          for(var i=0;i<options.length;i++){
            if(_reverse_options){
              options_order.push(i);
            } else {
              options_order.unshift(i);
            }
          }
          
          _option_boxes = [];//reset the option boxes
          
          var curr_opt_x = opt_dims.x;
          var curr_opt_y = opt_dims.y+opt_spacing;
          
          for(var opt_ind in options_order){
            var opt_id = options_order[opt_ind];
            var opt = options[opt_id];
            var option_box = {option: opt, x: curr_opt_x, y: curr_opt_y, width: opt_dims.width, height: box_height};
            
            
            _option_boxes.push(option_box);//save it for hit detection
            
            /*
            var text_obj = _globs.text_overlay.add_text(opt.shown,option_box.x,option_box.y,option_box.width,option_box.height);
            opt.text_id = text_obj.id;
            text_obj.div.addClass("option unselectable");//should come up with less general name for this
            */
            
            curr_opt_y += box_height+opt_spacing;
            
          }
            
        }
        
        OBJ.draw = function(ctx,window){
          
          var _context = ctx;
          
          get_shown_position(window);
          
          //log("shown "+_shown_x+":"+_shown_y);
          //log("OBJ "+OBJ.cx+":"+OBJ.cy);
          //log("window "+window.x+":"+window.y);
          
      /*
          ctx.globalAlpha = 0.5;
          BASE.roundRect(ctx,dismiss.x+0.5,dismiss.y+0.5,dismiss.width,dismiss.height,5);
          ctx.stroke();
        
          ctx.globalAlpha = 1.0;
          BASE.roundRect(ctx,dismiss.x+0.5,dismiss.y+0.5,dismiss.width,dismiss.height,5);
          ctx.stroke();
          */
          
          
          set_option_boxes();
         
         /*
           //surround the option boxes
          ctx.globalAlpha = 1.0;
          ctx.strokeStyle = "#000000";
          ctx.fillStyle = "#ffffff";
          ctx.lineWidth = 0.5;

          BASE.roundRect(ctx,_shown_x+_box.x+0.5,_shown_y+_box.y+0.5,_box.width,_box.height,5);
          ctx.stroke();  
          ctx.fill(); 
          */
          
          //draw circle at the origin of the menu (where the click was)
          ctx.globalAlpha = 1.0;
          ctx.strokeStyle = "#000000";
          ctx.fillStyle = "#ffffff";
          ctx.lineWidth = 1.5;

          
          ctx.save();
          ctx.beginPath();
          BASE.openDot(ctx,_shown_x,_shown_y,6,8,(_reverse_options ? 2 : 0));
          ctx.lineTo(_shown_x+_box.x+_box.width+0.5,_shown_y+_box.y+_box.height+0.5);
          ctx.lineTo(_shown_x+_box.x+_box.width+0.5,_shown_y+_box.y+0.5);
          ctx.lineTo(_shown_x+_box.x+0.5,_shown_y+_box.y+0.5);
          ctx.lineTo(_shown_x+_box.x+0.5,_shown_y+_box.y+_box.height+0.5);
          ctx.closePath();
          ctx.stroke();  
          ctx.fill();
          ctx.restore();
          
          //draw all the options
          for(var box_ind in _option_boxes){
            var box = _option_boxes[box_ind];

            /*
            ctx.fillStyle = "#ffffff";
            ctx.lineWidth = 0.5;
            BASE.roundRect(ctx,_shown_x+box.x+0.5,_shown_y+box.y+0.5,box.width,box.height,6);
            ctx.fill();
            ctx.stroke();
            */
            
            
            ctx.fillStyle = "#000000";    
            ctx.font = _font_height+"px Verdana";
            ctx.textAlign = "center"
            ctx.textBaseline = "middle";
            ctx.fillText(box.option.shown,_shown_x+box.x+box.width/2+0.5,_shown_y+box.y+box.height/2+0.5);

          }


            
        }
        
        OBJ.notify = function(event,vars){
        
          if(event == 'mouseup'){
          
            //for event == 'mouseup', vars will have: window,was_click,hook,mx,my
          
            get_shown_position(vars.window);
          
            if(OBJ.display){
            
              if(!vars.was_click) return {};
              
              var ret = {};
              
              for(var box_ind in _option_boxes){
                var box = _option_boxes[box_ind];
                if(
                  (vars.mx >= _shown_x+box.x && vars.mx < _shown_x+box.x+box.width) &&
                  (vars.my >= _shown_y+box.y && vars.my < _shown_y+box.y+box.height)
                ){
                  //do the thing
                  //alert(box.option.id);
                  if(handlers[box.option.id] != undefined){
                    
                    //call handler
                    handlers[box.option.id](box.option.id,vars.hook);
                  }
                  break;
                }
              }
            
              //we need to get rid of the menu first so hooks are clear for handlers
              OBJ.toggle_menu();
              
              ret.modal = true;//this signals to not send notifications to any of the other objects in the grid because it's all done
              ret.notify = false;
              ret.delete = true;
              return ret;
              
            } else {
            
              //will return whether it wants to be notified of all clicks in the future or not
          
              if(!vars.was_click) return {};//only respond to clicks and not drags
              
              OBJ.toggle_menu(vars.hook.cx,vars.hook.cy);
              
              //notify of all events not just targeted at the cell of menu
              //and make this object the only object that gets the notifications
              return {notify: true};
            }
          }
          
          return {};//not a recognized event
          
        }

        //delete_from_db and save_to_db are required for all grid objects but the menu object is not interactable by the grid
        //  so they won't be called
        
        return OBJ;

    };


});
