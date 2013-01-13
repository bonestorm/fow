
define(['base','table','join'],function(BASE,TABLE,JOIN){


    return function(globs){

        // the object we're encapsulating
        // show_grid: whether to show the cells and quads of the grid or not
        var OBJ = {
          show_grid: true,
          frozen: false
        };

        var _debug = false;
        
        var _mouse_down = false;//whether in the middle of a click or not
        var _mouse_down_nothing = true;

        var _selected_objs = {};
        var _clicked_hooks = [];//array of hooks with objects that were clicked on
        var _selected_objs_num = 0;//number of selected objects
        var _focused_obj;

        var _globs = globs;

        var _grid_cache_canvas;//saved canvas so we don't have to draw the expensive grid each time
        var _grid_cache_ctx;

        //these keep the information for things attached to the grid
        //object.hooks to place it on the grid
        //it may also have a notify() function to get notified of clicks on any of it's hooked cells
        //or dragging between one if its hooked cells and another cell
        var _objs = [];//a list of all of the objects.
        
        //every object in the grid needs an identifier.  they are drawn in order of their ids
        var _first_id = 0;
        var _last_id = 0;
        
        var _hooks = [];//a 2d array of arrays (making it a 3d array) of objects that describe the objects

        var _notify_list = [];//list of the objects in the grid that need to be notified of ANY clicks, not just on cells they are hooked in to
        
        //holds the position of the current window into the grid since it can't show the whole grid at once
        //the position is in quadrants
        OBJ.window = {x:5,y:6};
        
        //DRAG
        //DRAG
        var _drag_type;//different types of drags
        var _drag_last_win;//last window position
        var _drag_last_objs;
        var _drag_start;//mouse position when drag is started
        var _drag_start_win;//window when drag started
        var _drag_move_cell = {x:0,y:0};
        var _drag_move_quad = {x:0,y:0};
        var _drag_box = {x:0,y:0,width:0,height:0};
        var _drag_last_box = {x:0,y:0,width:0,height:0};
        var _drag_valid = true;
        
        var _drag_halo_xy;
        
        var _halo_cells = 30;
        var _half_halo_cells = Math.floor(_halo_cells/2);
        var _halo_size = _halo_cells*(_globs.cell_size*4);

        //create the halo canvas used for dragging objects around
        var _drag_mask_canvas = $('<canvas id="drag_mask" width="'+_halo_size+'" height="'+_halo_size+'">Too cool for HTML5, huh?</canvas>')[0];
        var _drag_mask_ctx = _drag_mask_canvas.getContext("2d");
        var _drag_halo_canvas = null;
        var _drag_halo_ctx = null;

       
        //border around the edges
      /*
        _drag_mask_ctx.lineWidth = 5.0;
        _drag_mask_ctx.strokeStyle = '#000000';        
        BASE.roundRect(_drag_mask_ctx, 0.5,0.5,_halo_size-1,_halo_size-1, 5);
        _drag_mask_ctx.stroke();
      */

        //create the taper out gradient
        var _drag_mask = null;

        /*
        _drag_mask_ctx.globalAlpha = 1.0;
        _drag_mask_ctx.fillStyle = _drag_mask;
        _drag_mask_ctx.fillRect(0,0,_halo_size,_halo_size);
        */
        //DRAG
        //DRAG

        
        var _mx,_my,_cx,_cy,_qx,_qy;//to store current mouse position for when we need it
        var _out_of_bounds;//when _mx and _my are out of bounds, they are clipped and _out_of_bounds becomes true
        
        //each quadrant of the grid is a 4x4 grid of cells that objects can be attached to
        //the cell grid is the small circles
        //the quadrant grid is the larger circles

        OBJ.resize = function(qwidth,qheight){
          _grid_cache_canvas = undefined;//will get generated again on a redraw
        }

        OBJ.reset_hooks = function(){
          _hooks = [];
          //fill out the skeleton of the grid of hooks
          for(var x=0;x<_globs.quads_wide;x++){
            var col = [];
            for(var y=0;y<_globs.quads_high;y++){
              col.push([]);
            }
            _hooks.push(col);
          }
        }

        //reset hooks to start
        OBJ.reset_hooks();


        //reset to an original state
        OBJ.reset = function(){
          OBJ.clear_selected();
          OBJ.reset_hooks();
          _clicked_hooks = [];
          _objs = [];
        }

        OBJ.cell_in_bounds = function(cx,cy){
          if(cx >= 0 && cy >= 0 && cx < _globs.quads_wide*4 && cy < _globs.quads_high*4){
            return true;
          } else {
            return false;
          }
        }
        
        //gets all the objects that are hooked to cell cx,cy and have type type (type undefined will get all types)
        OBJ.get_objects = function(cx,cy,type){

          var types;
          if(type instanceof Array){types = type;}else{types = [type];}

          //note: this function doesn't recognize any hooks that have active: false

          //if type is passed in then we only check for that type of object
          
          var qx = Math.floor(cx/4);
          var qy = Math.floor(cy/4);

          //if(qx < 0 || qy < 0 || qx >= _globs.quads_wide*4 || qy >= _globs.quads_high*4)
          //  return false;
          var found = [];

          function valid_object(hook){
            var valid = true;
            if(types[0] !== undefined){
              for(var i in types){
                var t = types[i];
                switch(t){
                  case "active"://if it's not active then it is not interacted with
                    if(hook.obj.active !== undefined){//object level
                      if(!hook.obj.active){valid = false;}
                    } else {
                      if(hook.active !== undefined){
                        if(!hook.active){valid = false;}
                      }
                    }
                  break;
                  case "inactive":
                    if(hook.obj.active !== undefined){//object level
                      if(hook.obj.active){valid = false;}
                    } else {
                      if(hook.active !== undefined){
                        if(hook.active){valid = false;}
                      }
                    }
                  break;
                  default:
                    if(typeof hook.obj.type == 'function'){
                      if(hook.obj.type() != t){
                        valid = false;
                      }
                    }
                  break;
                }
                if(!valid){break;}
              }
            }
            return valid;
          }

          for(var i=_hooks[qx][qy].length-1; i >= 0; i--){
            if(valid_object(_hooks[qx][qy][i])){
              if(_hooks[qx][qy][i].cx == cx && _hooks[qx][qy][i].cy == cy){
                found.push(_hooks[qx][qy][i]);
              }
            }
          }
          return found;
        }
        
        OBJ.obj_exists = function(id){if(_objs[id] != undefined){return true;} else {return false;}}

        OBJ.select_obj = function(obj,opts){

          var override = (opts.override !== undefined && opts.override);

          var selectable = (override || obj.grid_behavior.selectable === undefined || obj.grid_behavior.selectable);
          var unselectable = (override || obj.grid_behavior.unselectable === undefined || obj.grid_behavior.unselectable);

          if(opts.select && !selectable){return false;}
          if(!opts.select && !unselectable){return false;}

          if((obj.selected == undefined || obj.selected) && !opts.select){//turning off
            delete _selected_objs[obj.id];
            _selected_objs_num--;
            if(obj.select_notify !== undefined){obj.select_notify(false);};
          }
          if((obj.selected == undefined || !obj.selected) && opts.select){//turning on
            _selected_objs[obj.id] = obj;
            _selected_objs_num++;
            if(obj.select_notify !== undefined){obj.select_notify(true);};
          }

          obj.selected = opts.select;

          //grid takes care of focusing a single object so it can be shown and edited in the slist
          if(_selected_objs_num == 1){
            if(obj.focus_notify !== undefined){obj.focus_notify(true);}
            obj.focus = true;
            _focused_obj = obj;
            
            //a single focused join or table is a starting point for a new query composer
            if(obj.type() == "join" || obj.type() == "table"){
              _globs.composer.set_starting_point(obj);
            }
            
          } else {
            if(_focused_obj !== undefined){
              if(_focused_obj.focus_notify !== undefined){_focused_obj.focus_notify(false);}
              _focused_obj.focus = false;
              _focused_obj = undefined;
              _globs.composer.clear_starting_point();        
            }
          }

          return true;

        }

        //sends notifictions to any object hooked into a cell next to any of the hooks passed in
        OBJ.notify_neighbors = function(hooks){
        
          
          //keep track of cells next to the hook cell so we can notify neighbors of this added object
          var cells_next = {};
          //mark all hook cells first so we don't consider them neightbor cells
          for(var hook_ind in hooks){
            var hook = hooks[hook_ind];
            var m = "n"+hook.cx+":"+hook.cy;
            cells_next[m] = 1;
          }

          //keep track of objects that have been notified so we don't notify twice
          var to_notify = {};

          for(var hook_ind in hooks){    
            var hook = hooks[hook_ind];
            
            //check neighbors
            for(var nx=hook.cx-1;nx<=hook.cx+1;nx++){
              for(var ny=hook.cy-1;ny<=hook.cy+1;ny++){
                if(nx == hook.cx && ny == hook.cy){continue;}
                if(!OBJ.cell_in_bounds(hook.cx,hook.cy)){continue;}
                var nqx = Math.floor(nx/4);
                var nqy = Math.floor(ny/4);
                var m = "n"+nx+":"+ny;
                if(cells_next[m] === undefined){
                  cells_next[m] = 1;
                  for(var i=_hooks[nqx][nqy].length-1; i >= 0; i--){
                    var nobj = _hooks[nqx][nqy][i];
                    if(nobj.cx == nx && nobj.cy == ny){
                      to_notify[nobj.obj.id] = nobj.obj;
                    }
                  }
                }
              }
            }
          }
          
          //actually notify the collected objects
          for(var id in to_notify){
            var nobj = to_notify[id];
            if(nobj.neighbor_notify !== undefined){
              nobj.neighbor_notify();
            }
            //alert("notified cell:"+nobj.cx+":"+nobj.cy);
          }

        }
        
        OBJ.add_obj = function(obj,do_neighbor){//adds the object to the grid if it isn't already and hooks it in
          //obj should have an id inside and also
          //hooks, an array of cell positions that the object should be attached to
          
          if(obj.id == undefined){
            obj.id = ++_last_id;
            _objs[obj.id] = obj;
          }

          //add to grid hooks
          for(var hook_ind in obj.hooks){
          
            var hook = obj.hooks[hook_ind];
            
            var qx = Math.floor(hook.cx/4);
            var qy = Math.floor(hook.cy/4);
            
            var new_hook = {obj: obj,cx: hook.cx,cy: hook.cy};
            if(hook.active !== undefined){new_hook.active = hook.active;}
            _hooks[qx][qy].push(new_hook);
            //if(_debug) log("pushed "+obj.id+" at "+hook.cx+":"+hook.cy);
          }
          
          if(do_neighbor === undefined || do_neighbor){
            OBJ.notify_neighbors(obj.hooks);
          }
          
        }
        
        OBJ.remove_obj = function(obj){//removes the object's hooks into the grid but doesn't delete the object
          for(var hook_ind in obj.hooks){
            var hook = obj.hooks[hook_ind];
            var qx = Math.floor(hook.cx/4);
            var qy = Math.floor(hook.cy/4);
            
            //log('hook, length'+_hooks[qx][qy].length);
            //log(qx+":"+qy);
            
            for(var i=_hooks[qx][qy].length-1; i >= 0; i--){
              if(_hooks[qx][qy][i].obj.id == obj.id){
                //if(_debug) log("spliced "+obj.id+" at "+hook.cx+":"+hook.cy);
                _hooks[qx][qy].splice(i,1);
              }
            }
          }  
        }
        
        OBJ.delete_obj = function(obj){//removes from the grid completely, including from the hooks
          OBJ.remove_obj(obj);
          if(obj.hooks !== undefined){obj.hooks = [];}
          delete _objs[obj.id];
          for(var i=_notify_list.length-1; i >= 0; i--){
            var hook = _notify_list[i];
            if(hook.obj.id == obj.id){
              _notify_list.splice(i,1);
            }
          }
          if(_selected_objs[obj.id] != undefined) OBJ.select_obj(_selected_objs[obj.id],{select:false,override:true});
        }
        
        function _set_mouse_coord_vars(){
          _mx = _globs.input.x();
          _my = _globs.input.y();
          _out_of_bounds = false;
          if(_mx < 0) { _mx = 0; _out_of_bounds = true;}
          if(_my < 0) { _my = 0; _out_of_bounds = true;}
          if(_mx >= _globs.width) { _mx = _globs.width-1; _out_of_bounds = true;}
          if(_my >= _globs.height) { _my = _globs.height-1; _out_of_bounds = true;}
          _cx = Math.floor(_mx/_globs.cell_size)+OBJ.window.x*4;
          _cy = Math.floor(_my/_globs.cell_size)+OBJ.window.y*4;
          OBJ.cx = _cx;
          OBJ.cy = _cy;
          _qx = Math.floor(_cx/4);
          _qy = Math.floor(_cy/4);
        }

        function select_in_box(box){

          var sx = box.x+OBJ.window.x*4;var sy = box.y+OBJ.window.y*4;
          var ex = sx+box.width;var ey = sy+box.height;

          var qsx = Math.floor(sx/4);var qsy = Math.floor(sy/4);
          var qex = Math.floor((ex-1)/4);var qey = Math.floor((ey-1)/4);

          //draw all the objects in the grid
          var selected = [];
          for(var qx=qsx;qx<=qex;qx++){
            for(var qy=qsy;qy<=qey;qy++){
              for(var quad_ind in _hooks[qx][qy]){
                var h = _hooks[qx][qy][quad_ind];
                if(h.cx >= sx && h.cy >= sy && h.cx < ex && h.cy < ey){
                  var obj = _hooks[qx][qy][quad_ind].obj;
                  var box_sel = obj.grid_behavior.box_selectable;
                  if((box_sel === undefined || box_sel) && selected[obj.id] === undefined){
                    OBJ.select_obj(obj,{select:true,override: true});
                    selected[obj.id] = 1;
                  }
                }
              }
            }
          }

        }

        OBJ.is_out_of_bounds = function(x,y){
          _set_mouse_coord_vars();
          return _out_of_bounds;
        }
        
        
        var PI2 = Math.PI*2;
        
        function draw_background(){//draw the little grid in the background
        
          if(OBJ.show_grid){
            if(_grid_cache_canvas == undefined){//generate the cache
            
              var width = _globs.width+_globs.border*2;
              var height = _globs.height+_globs.border*2;
              
              _grid_cache_canvas = $('<canvas id="grid_cache" width="'+width+'" height="'+height+'">Too cool for HTML5, huh?</canvas>')[0];
              //$(document).append(_grid_cache_canvas);
              //alert(_grid_cache_canvas);
              _grid_cache_ctx = _grid_cache_canvas.getContext("2d");
              //alert(_grid_cache_ctx);
              
              _grid_cache_ctx.save();
              _grid_cache_ctx.setTransform(1,0,0,1,_globs.border,_globs.border);//simple translation

              _grid_cache_ctx.globalAlpha = 1.0;
               
              _grid_cache_ctx.fillStyle = _globs.grid_background_color;
              
              _grid_cache_ctx.fillRect(-_globs.border,-_globs.border,_globs.width+_globs.border*2,_globs.height+_globs.border*2); 
              
              _grid_cache_ctx.globalAlpha = 0.4;

              
              _grid_cache_ctx.strokeStyle = "#000000";
              _grid_cache_ctx.lineWidth = 0.5;

              for(var x = 0;x<=_globs.width;x+=64){
                for(var y = 0;y<=_globs.height;y+=64){
                  _grid_cache_ctx.beginPath();
                  _grid_cache_ctx.arc(x,y,2.5,0,PI2,true);
                  _grid_cache_ctx.stroke();
                  _grid_cache_ctx.closePath();        
                }
              }
              
              _grid_cache_ctx.globalAlpha = 0.2;
              
              for(var x = 0;x<=_globs.width;x+=16){
                for(var y = 0;y<=_globs.height;y+=16){
                  _grid_cache_ctx.beginPath();
                  _grid_cache_ctx.arc(x,y,1.5,0,PI2,true);
                  _grid_cache_ctx.stroke();
                  _grid_cache_ctx.closePath();        
                }
              }
              
              _grid_cache_ctx.restore();
              
            }

             
            //draw the cache   
            _globs.context.save();
            _globs.context.setTransform(1,0,0,1,_globs.margin.x,_globs.margin.y);//simple translation
            _globs.context.globalAlpha = 1.0;
            _globs.context.drawImage(_grid_cache_canvas,0,0);
            _globs.context.restore();

          }
          
        }
        
        function draw_debug_hooks() {
            //draw the hooks for debugging
          _globs.context.save();
          _globs.context.setTransform(1,0,0,1,_globs.border+_globs.margin.x,_globs.border+_globs.margin.y);//simple translation
          _globs.context.strokeStyle = "#000000";
          _globs.context.lineWidth = 1;
          _globs.context.globalAlpha = 0.5;

          for(var x = 0;x<_globs.win_quads_wide;x++){
            for(var y = 0;y<_globs.win_quads_high;y++){
              var hook = _hooks[x+OBJ.window.x][y+OBJ.window.y];
              for(var i=0;i<hook.length;i++){
                var cx = hook[i].cx-OBJ.window.x*4;
                var cy = hook[i].cy-OBJ.window.y*4;
                _globs.context.beginPath();
                _globs.context.arc(cx*_globs.cell_size+8+0.5,cy*_globs.cell_size+8+0.5,5,0,PI2,true);
                _globs.context.stroke();
                _globs.context.closePath();
              }
            }
          }
          _globs.context.restore();
        }
          
        function draw_scroll_tips(){

          _globs.context.save();
          
          _globs.context.fillStyle = "#000000";
          _globs.context.strokeStyle = "#ffffff";
          _globs.context.lineWidth = 10;
          _globs.context.font = "9px Verdana";
          _globs.context.textAlign = "center"
          _globs.context.textBaseline = "middle";
          
          var brdr = _globs.border;
          var height = _globs.height;
          var width = _globs.width;
          var offs = 25;//offset from the corner of the grid
          
          function stroke_fill_Text(text,x,y){
            _globs.context.beginPath();
            _globs.context.strokeText(text,x,y);
            _globs.context.closePath();
            _globs.context.fillText(text,x,y);
          }
          
          //top left
          stroke_fill_Text(OBJ.window.x,-offs+0.5,0.5);
          stroke_fill_Text(OBJ.window.y,0.5,-offs+0.5);

          //top right
          stroke_fill_Text(_globs.over_wide-OBJ.window.x,offs+width+0.5,0.5);
          stroke_fill_Text(OBJ.window.y,width+0.5,-offs+0.5);

          //bottom left
          stroke_fill_Text(OBJ.window.x,-offs+0.5,height+0.5);
          stroke_fill_Text(_globs.over_high-OBJ.window.y,0.5,offs+height+0.5);

          //bottom right
          stroke_fill_Text(_globs.over_wide-OBJ.window.x,offs+width+0.5,height+0.5);
          stroke_fill_Text(_globs.over_high-OBJ.window.y,width+0.5,offs+height+0.5);

          _globs.context.restore();
          
        }
        
        function draw_border_fade(){
            
          //draw the gradiant around the border
          _globs.context.save();
          _globs.context.setTransform(1,0,0,1,_globs.margin.x,_globs.margin.y);//simple translation
          
          _globs.context.globalAlpha = 1;

          var left_grad = _globs.context.createLinearGradient(0,0,_globs.border,0);
          left_grad.addColorStop(0,   _globs.rgba_background_color+',1)');
          left_grad.addColorStop(1,   _globs.rgba_background_color+',0)');
          _globs.context.fillStyle = left_grad;
          _globs.context.fillRect(0,_globs.border,_globs.border,_globs.height);
          
          var right_grad = _globs.context.createLinearGradient(_globs.width+_globs.border,0,_globs.width+_globs.border*2,0);
          right_grad.addColorStop(0,   _globs.rgba_background_color+',0)');
          right_grad.addColorStop(1,   _globs.rgba_background_color+',1)');
          _globs.context.fillStyle = right_grad;
          _globs.context.fillRect(_globs.width+_globs.border,_globs.border,_globs.border,_globs.height);

          
          var top_grad = _globs.context.createLinearGradient(0,0,0,_globs.border);
          top_grad.addColorStop(0,   _globs.rgba_background_color+',1)');
          top_grad.addColorStop(1,   _globs.rgba_background_color+',0)');
          _globs.context.fillStyle = top_grad;
          _globs.context.fillRect(_globs.border,0,_globs.width,_globs.border);
          
          var bottom_grad = _globs.context.createLinearGradient(0,_globs.height+_globs.border,0,_globs.height+_globs.border*2);
          bottom_grad.addColorStop(0,   _globs.rgba_background_color+',0)');
          bottom_grad.addColorStop(1,   _globs.rgba_background_color+',1)');
          _globs.context.fillStyle = bottom_grad;
          _globs.context.fillRect(_globs.border,_globs.height+_globs.border,_globs.width,_globs.border);

          //corners
          
          var tl_grad = _globs.context.createRadialGradient(_globs.border,_globs.border,0,_globs.border,_globs.border,_globs.border);
          tl_grad.addColorStop(0,   _globs.rgba_background_color+',0)');
          tl_grad.addColorStop(1,   _globs.rgba_background_color+',1)');
          _globs.context.fillStyle = tl_grad;
          _globs.context.fillRect(0,0,_globs.border,_globs.border);
          var tr_grad = _globs.context.createRadialGradient(_globs.border+_globs.width,_globs.border,0,_globs.border+_globs.width,_globs.border,_globs.border);
          tr_grad.addColorStop(0,   _globs.rgba_background_color+',0)');
          tr_grad.addColorStop(1,   _globs.rgba_background_color+',1)');
          _globs.context.fillStyle = tr_grad;
          _globs.context.fillRect(_globs.width+_globs.border,0,_globs.width+_globs.border*2,_globs.border);
          var bl_grad = _globs.context.createRadialGradient(_globs.border,_globs.height+_globs.border,0,_globs.border,_globs.height+_globs.border,_globs.border);
          bl_grad.addColorStop(0,   _globs.rgba_background_color+',0)');
          bl_grad.addColorStop(1,   _globs.rgba_background_color+',1)');
          _globs.context.fillStyle = bl_grad;
          _globs.context.fillRect(0,_globs.height+_globs.border,_globs.border,_globs.height+_globs.border*2);
          var br_grad = _globs.context.createRadialGradient(_globs.border+_globs.width,_globs.height+_globs.border,0,_globs.border+_globs.width,_globs.height+_globs.border,_globs.border);
          br_grad.addColorStop(0,   _globs.rgba_background_color+',0)');
          br_grad.addColorStop(1,   _globs.rgba_background_color+',1)');
          _globs.context.fillStyle = br_grad;
          _globs.context.fillRect(_globs.width+_globs.border,_globs.height+_globs.border,_globs.width+_globs.border*2,_globs.height+_globs.border*2);

          
          _globs.context.restore();

        }

        function draw_objects(ctx,to_draw,win){
          
          var to_draw_ids = [];
          var to_draw_zs = {};
          for(var obj_id in to_draw){
            to_draw_ids.push(obj_id);
            to_draw_zs[obj_id] = (to_draw[obj_id].z === undefined) ? 1 : to_draw[obj_id].z;
          }
          
          var draw_ids_sorted = to_draw_ids.sort(function(a,b){
            var zdiff = to_draw_zs[a]-to_draw_zs[b];
            return (zdiff != 0) ? zdiff : (a-b);
          });
          for(var obj_ind in draw_ids_sorted){
            var obj_id = draw_ids_sorted[obj_ind];
            if(to_draw[obj_id].draw != undefined){
              to_draw[obj_id].draw(ctx,win);//let it draw itself
            }
          }
        }
        
        function draw_objects_in_area(draw_vars,selected){
          
          //selected is passed as true to only draw selected objects, false to only draw unselected, undefined to draw all
          
          var to_draw = {};
            
          //draw all the objects in the grid
          for(var x=draw_vars.x;x<draw_vars.x+draw_vars.width;x++){
            for(var y=draw_vars.y;y<draw_vars.y+draw_vars.height;y++){
              var qx = x+draw_vars.win_x;
              var qy = y+draw_vars.win_y;
              if(qx >= 0 && qx < _globs.quads_wide && qy >= 0 && qy < _globs.quads_high){
                for(var quad_ind in _hooks[qx][qy]){
                  var quad = _hooks[qx][qy][quad_ind];
                  if(selected == undefined || quad.obj.selected == undefined || quad.obj.selected == selected){
                    to_draw[quad.obj.id] = quad.obj;
                  }
                }
              }
            }
          }
          
          draw_objects(draw_vars.ctx,to_draw,{x: draw_vars.win_x,y: draw_vars.win_y});
          
        }
        
        function draw_drag_halo(){
        }
        
        function draw_grid(){
        
          draw_background();
          
          //var drawn = [];//collect all objects that are drawn so we don't draw them more than once
          
          var lip = 1;
          
          //log("drawing grid");
          
          draw_objects_in_area({
            ctx: _globs.context, 
            x: -lip,y: -lip,
            width: _globs.win_quads_wide+lip*2,height: _globs.win_quads_high+lip*2,
            win_x: OBJ.window.x,
            win_y: OBJ.window.y
          },
            undefined//(_drag_type == 'objects' ? false : undefined)
          );

          //draw selection box
          if(
            _drag_type !== undefined && _drag_type == "box" &&
            _drag_box.width > 0 && _drag_box.height > 0
          ){

            var cwh = _globs.cell_size;

            //border

            _globs.context.globalAlpha = 0.5;
            _globs.context.strokeStyle = "#000000";
            _globs.context.fillStyle = "#ffffff";
            _globs.context.lineWidth = 4;
            BASE.roundRect(_globs.context,
              _drag_box.x*cwh+0.5,_drag_box.y*cwh+0.5,
              _drag_box.width*cwh, _drag_box.height*cwh, 
            4); 
            _globs.context.stroke();


          }

          //fill top margin
          _globs.context.fillStyle = _globs.rgba_background_color+',1)';
          //_globs.context.fillStyle = "rgba(0,0,0,1)";
          _globs.context.fillRect(
            -(_globs.border+_globs.margin.x),
            -(_globs.border+_globs.margin.y),
            _globs.width+_globs.border*2+_globs.margin.x,
            _globs.margin.y
          );

          draw_border_fade();
          
          draw_scroll_tips();//draw information on where the window is in the overall graph
        
          //current database in grid
          if(_globs.slist.picked_database !== undefined && globs.slist.picked_database.length > 0){
            _globs.context.fillStyle = "#ffffff";
            _globs.context.strokeStyle = "#000000";
            _globs.context.font = "48px Verdana";
            _globs.context.textAlign = "center"
            _globs.context.textBaseline = "hanging";
            _globs.context.lineWidth = 1.5;
            _globs.context.globalAlpha = 1.0;
            _globs.context.fillText(globs.slist.picked_database,Math.round(_globs.width/2)+0.5,5+0.5);
            _globs.context.globalAlpha = 0.4;
            _globs.context.strokeText(globs.slist.picked_database,Math.round(_globs.width/2)+0.5,5+0.5);
          }
          
          if(_drag_type == 'objects'){
            
            _set_mouse_coord_vars();
            
            //draw_drag_halo();//when moving objects in a grid a halo appears at the cursor to show how the move will look like
            if(_drag_halo_ctx == null){
            
              _drag_halo_canvas = $('<canvas id="drag_halo" width="'+_halo_size+'" height="'+_halo_size+'">Too cool for HTML5, huh?</canvas>')[0];
              _drag_halo_ctx = _drag_halo_canvas.getContext("2d");

              //draw everything first
              _drag_halo_ctx.globalCompositeOperation = 'source-over';
              
              /*
              draw_objects_in_area({
                ctx: _drag_halo_ctx, 
                x: 0,y: 0,width: 5,height: 5,//for only a small area
                win_x: Math.floor(_drag_halo_xy.x/4)-2,win_y: Math.floor(_drag_halo_xy.y/4)-2//this stays the same right at the beginning of the halo
              },
                true
              );
              */
              
              draw_objects(
                _drag_halo_ctx,_selected_objs,
                {x: Math.floor(_drag_halo_xy.x/4)-_half_halo_cells,y: Math.floor(_drag_halo_xy.y/4)-_half_halo_cells}//for window
              );
              
       
              //halo mask it ing
              _drag_halo_ctx.globalCompositeOperation = 'destination-in';

              _drag_mask = _drag_halo_ctx.createRadialGradient(
                _halo_size/2,_halo_size/2,0,
                _halo_size/2,_halo_size/2,_halo_size/2
              );
              _drag_mask.addColorStop(0,'rgba(0,0,0,1)');
              _drag_mask.addColorStop(1,'rgba(0,0,0,0.6)');
              _drag_halo_ctx.fillStyle = _drag_mask;
              _drag_halo_ctx.fillRect(0,0,_halo_size,_halo_size);

              _drag_halo_ctx.globalAlpha = 1;
              _drag_halo_ctx.globalCompositeOperation = 'source-over';
              _drag_halo_ctx.drawImage(_drag_mask_canvas,0,0,_halo_size,_halo_size);

              
            }
            
            var mod_x = _drag_halo_xy.x%4;
            var mod_y = _drag_halo_xy.y%4;
            
            //draw the halo cache   
            _globs.context.globalAlpha = (_drag_valid ? 0.8 : 0.2);
            
            _globs.context.drawImage(
              _drag_halo_canvas,
              (_cx-mod_x-(OBJ.window.x+_half_halo_cells)*4)*_globs.cell_size,
              (_cy-mod_y-(OBJ.window.y+_half_halo_cells)*4)*_globs.cell_size
            );
            
          }
                  
          if(_debug){draw_debug_hooks();}

        }


        
        OBJ.draw = function(){
          //alert(_globs.width);
          if(_globs.slist.picked_database !== undefined){
            draw_grid();
          }
        }

        OBJ.clear_selected = function(){
          var ret = false;
          if(OBJ.frozen == false){
            for(var obj_ind in _selected_objs){
              OBJ.select_obj(_objs[obj_ind],{select:false,override:true});
              ret = true;
            }
            if(_globs.menu.display){
              ret = true;
              _globs.menu.toggle_menu();
              OBJ.delete_obj(_globs.menu);
            };
          }
          return ret;
        }

        OBJ.freeze = function(){OBJ.frozen = true;}
        OBJ.unfreeze = function(){OBJ.frozen = false;}


        OBJ.delete_selected = function(){

          var sel_obj_ids = [];
          for(var obj_ind in _selected_objs){
            sel_obj_ids.push(_selected_objs[obj_ind].id);
          }

          if(sel_obj_ids.length > 0) {

            OBJ.freeze();

            OBJ.clear_selected();

            for(var obj_ind in sel_obj_ids){
              var obj_id = sel_obj_ids[obj_ind];
              _objs[obj_id].updating = true;
              _objs[obj_id].active = false;
            }

            //now we save all the objects
            function chain_delete_object(i){
               _objs[sel_obj_ids[i]].delete_from_db(
                function(json){
                  _objs[sel_obj_ids[i]].updating = false;//done updating
                  _objs[sel_obj_ids[i]].active = true;//can interact again
                  OBJ.delete_obj(_objs[sel_obj_ids[i]]);
                  if(i < sel_obj_ids.length-1){
                    chain_delete_object(i+1);
                  } else {
                    OBJ.unfreeze();
                    _globs.slist.start_input_type("tables");
                  }
                  _globs.refresh();
                }
              );
            }
            chain_delete_object(0);

          }


        }
        
        function save_for_init_drag(){
          OBJ.init_drag_save = {
            win: [OBJ.window.x,OBJ.window.y],
            m: [_mx,_my],c: [_cx,_cy]
          };
        }

        function init_drag(from_saved){
          if(from_saved === undefined && !from_saved){
            save_for_init_drag();
          }
          var ids = OBJ.init_drag_save;
          _drag_start_win = {x:ids["win"][0],y:ids["win"][1]};
          _drag_last_win = {x:ids["win"][0],y:ids["win"][1]};
          _drag_last_objs = {x:0,y:0};
          _drag_start = {x:ids["m"][0],y:ids["m"][1]};
          _drag_halo_xy = {x: ids["c"][0],y: ids["c"][1]};
        }
        
        function on_selected_objs(operation,move_cell){

           //operation is = 'validate' to just figure out if the move is valid
           //operation is = 'move' to actually perform the move
           

          var can_move = true;
          
          var objs_to_update = [];

          //check that the new position is a valid one
          all_hooks:
          for(var sel_obj_id in _selected_objs){

            
            var sel_obj = _objs[sel_obj_id];
            if(sel_obj.hooks != undefined){
            
              if(operation == "move"){
                OBJ.remove_obj(sel_obj);//remove if from the old position
                sel_obj.cx += move_cell.x;
                sel_obj.cy += move_cell.y;
              }
              
              for(var hook_ind in sel_obj.hooks){
                var hook = sel_obj.hooks[hook_ind];
                
                if(operation == "validate"){
                
                  var new_cx = hook.cx+move_cell.x;
                  var new_cy = hook.cy+move_cell.y;
                
                  //inside the borders
                  if(new_cx < 0 || new_cy < 0 || new_cx >= _globs.quads_wide*4 || new_cy >= _globs.quads_high*4){
                    can_move = false;
                    break all_hooks;
                  } else {
                    var qx = Math.floor(new_cx/4);
                    var qy = Math.floor(new_cy/4);
                    for(var i=_hooks[qx][qy].length-1; i >= 0; i--){
                      if(
                        (_hooks[qx][qy][i].obj.selected == undefined || !_hooks[qx][qy][i].obj.selected) &&
                        (_hooks[qx][qy][i].cx == new_cx && _hooks[qx][qy][i].cy == new_cy)
                      ){
                        can_move = false;
                        break all_hooks;
                      }
                    }
                  }
                }
                
                if(operation == "move"){
                  hook.cx += move_cell.x;
                  hook.cy += move_cell.y;
                }
                
              }
              
              if(operation == "move"){
                OBJ.add_obj(sel_obj);//add it to the new position
                objs_to_update.push(sel_obj);
              }
              
            }
          }

          //save the move to the database
          if(operation == "move"){

            OBJ.freeze();
            for(var i in objs_to_update){
              objs_to_update[i].updating = true;
              objs_to_update[i].active = false;//can't interact with this object
            }
            _globs.refresh();

            //now we save all the objects
            function save_object(i){
               objs_to_update[i].save_to_db(
                function(json){
                  objs_to_update[i].updating = false;//done updating
                  objs_to_update[i].active = true;//can interact again
                  _globs.refresh();
                  if(i < objs_to_update.length-1){
                    save_object(i+1);
                  } else {
                    OBJ.unfreeze();
                  }
                }
              );
            }
            save_object(0);
          }
          
          return can_move;
          
        }
        
        function send_notifications(event,event_vars){

          var refresh = false;

          //send the notify message and then refreshed the hooks in case anything has changed
          function send_object_click_notify(hook){
            var ret;
            if(hook.obj.notify != undefined){//some objects don't take notifications
              event_vars.window = OBJ.window;
              event_vars.hook = hook;
              event_vars.mx = _mx;event_vars.my = _my;
              event_vars.cx = _cx;event_vars.cy = _cy;

              var hooks_before = hook.obj.hooks.length;

              //var event_vars = {window: OBJ.window,was_click: was_click,hook: hook,mx: _mx,my: _my};
              ret = hook.obj.notify(event,event_vars);
              
              if(ret.refresh !== undefined && ret.refresh){refresh = true;}//an object needs a refresh

              var keep_obj = (ret.delete == undefined || ret.delete != true);        
              
              if(!keep_obj){
                OBJ.remove_obj(hook.obj);
                //now we can safely delete the object's hook structure
                hook.obj.hooks = [];
                delete _objs[hook.obj.id];
              } else {
                if(hook.obj.new_hooks !== undefined && hook.obj.new_hooks.length > 0){
                  OBJ.remove_obj(hook.obj);
                  hook.obj.hooks = hook.obj.new_hooks;
                  hook.obj.new_hooks = [];
                  OBJ.add_obj(hook.obj);
                } else {
                  if(hooks_before != hook.obj.hooks.length){
                    OBJ.remove_obj(hook.obj);
                    OBJ.add_obj(hook.obj);
                  }
                }
              }
              
            }
            return ret;
          }

          
          function targeted_click_notify(hook){
            var ret = send_object_click_notify(hook);
            if(ret.notify != undefined && ret.notify){
              _notify_list.push(hook);
            }
          }    
          
          
          var already_notified = [];
          var modal = false;
          
          //notify all objects that request to be notified even if they are not the target
          for(var i=_notify_list.length-1; i >= 0; i--){
            var hook = _notify_list[i];
            var ret = send_object_click_notify(hook);
            already_notified[hook.obj.id] = 1;
            if(ret.notify != undefined && !ret.notify){
              _notify_list.splice(i,1);
            }
            if(ret.modal != undefined && ret.modal){
              modal = true;
            }
          }
        
          if(!modal){
            if(_qx >= OBJ.window.x && _qx < OBJ.window.x+_globs.win_quads_wide && _qy >= OBJ.window.y && _qy < OBJ.window.y+_globs.win_quads_high){
            
              //if the cell is empty then we can present the general menu
              var show_general = true;//even if the quadrant is empty, the cell may still be empty.
              
              if(_hooks[_qx][_qy].length > 0){//look through all hooks and notify when there is a hit
                for(var hook_ind in _hooks[_qx][_qy]){
                  var hook = _hooks[_qx][_qy][hook_ind];
                  if(hook.cx == _cx && hook.cy == _cy){
                    if(already_notified[hook.obj.id] == undefined){
                      show_general = false;
                      targeted_click_notify(hook);
                    }
                  }
                }
              }
              
              if(show_general && (already_notified[_globs.menu.id] == undefined)){
                
                if(_selected_objs_num == 0){
                  targeted_click_notify({cx: _cx,cy: _cy,obj: _globs.menu});//package it up like a hook
                }

                if(event == "mouseup" && _selected_objs_num > 0){
                  OBJ.clear_selected();
                }
                
              }
              
            }
          }
          
          if(refresh){_globs.refresh();}

        }
        
        function mousedown_handler(){

          _set_mouse_coord_vars();
          
          if(_out_of_bounds){return;}
          
         
          if(_globs.slist.selected){
            _globs.slist.unfocus();//in case a dropdown is active or something
          }
          if(_globs.composer.selected){
            _globs.composer.unfocus();
          }

      //    } else {

            send_notifications("mousedown",{});

            _mouse_down = true;
            _mouse_down_nothing = false;//whether it hit nothing on mousedown
            _drag_type = null;
            _drag_valid = true;
            
            if(_globs.key.altKey || _globs.key.ctrlKey){
              _drag_type = "window";
            } else {

              //dragging the window around is only initialized when the initial click is in an empty area
              _clicked_hooks = _globs.grid.get_objects(_cx,_cy,"active");
              if(_clicked_hooks.length > 0){
                var drag_the_objects = false;
                for(var obj_ind in _clicked_hooks){
                  var obj = _clicked_hooks[obj_ind].obj;
                  if(obj.selected){
                    drag_the_objects = true;
                    break;
                  }
                }
                if(drag_the_objects){
                  _drag_type = "objects";  
                } else {
                  //save the variables from a drag initialization
                  //because we don't know until the mouse moved that it's a drag of a single object
                  save_for_init_drag();
                }

              } else {
                var any_hooks = _globs.grid.get_objects(_cx,_cy);
                if(any_hooks.length == 0){
                  _mouse_down_nothing = 1;
                  save_for_init_drag();//could be a box drag so save it
                }
              }

            }
            if(_drag_type != null){
              init_drag();
            }

       
          _globs.refresh();

          return false;//return to to signal that it has consummed the input and it shouldn't be propegated

        }
        
        function move_handler(x,y,stationary){
        
          if(OBJ.frozen){return;}

          _set_mouse_coord_vars();

          send_notifications("mousemove",{});

          if(_mouse_down){
            if(_mouse_down_nothing){
              _drag_type = "box";//box to select stuff
              init_drag(true);
            } else {
              if(_drag_type == null){
                 if(_clicked_hooks.length > 0){//no selected objects but we did click on something
                  //select everything clicked on
                  OBJ.clear_selected();
                  var num_selected = 0;
                  for(var obj_ind in _clicked_hooks){
                    var grid_obj = _clicked_hooks[obj_ind].obj;
                    if(OBJ.select_obj(grid_obj,{select:true})){//this actually selects the object
                      num_selected++;
                    }
                  }
                  if(num_selected == 0){
                    OBJ.clear_selected();
                  } else {
                    _drag_type = "objects";
                    init_drag(true);//true to tell it to used the saved variables during mousedown
                  }
                  _globs.refresh();
                }
              }
            }
          }

          if(_drag_type != null){
            var drag_diff = {x: _mx-_drag_start.x,y: _my-_drag_start.y};
            
            var q_wh = _globs.cell_size*4;
            var drag_mid_mq = {//in pixels but in center quad
              x:(Math.floor(_drag_start.x/q_wh)+0.5)*q_wh,
              y:(Math.floor(_drag_start.y/q_wh)+0.5)*q_wh
            };

            
            if(_drag_type == "window"){
            
              var start_quad = {//in quads
                x:Math.floor(_drag_start.x/q_wh),
                y:Math.floor(_drag_start.y/q_wh)
              };
              
              var to_quad = {//in quads
                x:Math.floor((drag_mid_mq.x+drag_diff.x)/q_wh),
                y:Math.floor((drag_mid_mq.y+drag_diff.y)/q_wh)
              };
              
              _drag_move_quad = {//in quads
                x:to_quad.x-start_quad.x,
                y:to_quad.y-start_quad.y
              };
              
              var new_win_x = _drag_start_win.x-_drag_move_quad.x;
              var new_win_y = _drag_start_win.y-_drag_move_quad.y;

              if(new_win_x < 0){new_win_x = 0;}
              if(new_win_x > _globs.over_wide){new_win_x = _globs.over_wide;}
              if(new_win_y < 0){new_win_y = 0;}
              if(new_win_y > _globs.over_high){new_win_y = _globs.over_high;}
              
              if(new_win_x != _drag_last_win.x || new_win_y != _drag_last_win.y){
              
                OBJ.window.x = new_win_x;
                OBJ.window.y = new_win_y;
                
                _globs.refresh();
                
                _drag_last_win.x = new_win_x;_drag_last_win.y = new_win_y;
                
              }
            }
            if(_drag_type == "objects"){

              var start_cell = {//in cells
                x:Math.floor(_drag_start.x/_globs.cell_size),
                y:Math.floor(_drag_start.y/_globs.cell_size)
              };
              
              var to_cell = {//in cells
                x:Math.floor((_drag_start.x+drag_diff.x)/_globs.cell_size),
                y:Math.floor((_drag_start.y+drag_diff.y)/_globs.cell_size)
              };

              _drag_move_cell = {//in cells
                x:to_cell.x-start_cell.x,
                y:to_cell.y-start_cell.y
              };

              if(_drag_last_objs.x != _drag_move_cell.x || _drag_last_objs.y != _drag_move_cell.y){
                
                _drag_valid = on_selected_objs("validate",_drag_move_cell);//check for collisions and out of bounds
                  
                _globs.refresh();
              
                _drag_last_objs.x = _drag_move_cell.x;
                _drag_last_objs.y = _drag_move_cell.y;
                
              }//endif changed cell
                
            }
            if(_drag_type == "box" && !stationary){

              var start_cell = {//in cells
                x:_drag_start.x/_globs.cell_size,
                y:_drag_start.y/_globs.cell_size
              };
              
              var to_cell = {//in cells
                x:(_drag_start.x+drag_diff.x)/_globs.cell_size,
                y:(_drag_start.y+drag_diff.y)/_globs.cell_size
              };

              //flip them if switched
              if(to_cell.x < start_cell.x){var tx=start_cell.x;start_cell.x = to_cell.x;to_cell.x = tx;}
              if(to_cell.y < start_cell.y){var ty=start_cell.y;start_cell.y = to_cell.y;to_cell.y = ty;}

              //round to open box window to cell boundries
              to_cell.x = Math.ceil(to_cell.x);
              to_cell.y = Math.ceil(to_cell.y);
              start_cell.x = Math.floor(start_cell.x);
              start_cell.y = Math.floor(start_cell.y);

              _drag_move_cell = {//in cells
                x:to_cell.x-start_cell.x,
                y:to_cell.y-start_cell.y
              };

              _drag_box.x = start_cell.x;_drag_box.y = start_cell.y;
              _drag_box.width = Math.abs(start_cell.x-to_cell.x);
              _drag_box.height = Math.abs(start_cell.y-to_cell.y);

              if(
                _drag_box.x != _drag_last_box.x || _drag_box.y != _drag_last_box.y ||
                _drag_box.width != _drag_last_box.width || _drag_box.height != _drag_last_box.height
              ){
                  
                _globs.refresh();

                //update the last box to the current one
                _drag_last_box.x = _drag_box.x;
                _drag_last_box.y = _drag_box.y;
                _drag_last_box.width = _drag_box.width;
                _drag_last_box.height = _drag_box.height;

              }
              
            }

            return false;//return to to signal that it has consummed the input and it shouldn't be propegated

          }
          
          
        }//end move handler
          
        //main handler of clicks
        //will send out click notifications to objects on the grid
        function mouseup_handler(was_click){

          _set_mouse_coord_vars();
          
          //if(_out_of_bounds){return;}

          if(_mouse_down){
            _mouse_down = false;
            
            if(was_click || (!was_click && _drag_type == null)){
              send_notifications("mouseup",{was_click: was_click});
            } else {
              //execute the moving of the objects if it's a valid move
              if(_drag_type == "objects" && _drag_valid){
                on_selected_objs("move",_drag_move_cell);
              } else {
                if(_drag_type == "box"){
                  if(!_globs.key.shiftKey){
                    OBJ.clear_selected();
                  }
                  select_in_box(_drag_box);
                }
              }
            }
            
            _drag_type = null;
            
            _drag_last_win = null;
            _drag_start = null;
            _drag_start_win = null;
          
            _drag_halo_ctx = null;
            _drag_halo_canvas = null;
            _drag_mask = null;


            _drag_box = {x:0,y:0,width:0,height:0};
            _drag_last_box = {x:0,y:0,width:0,height:0};

            _globs.refresh();
          }

          return false;//return to to signal that it has consummed the input and it shouldn't be propegated

        }  
        _globs.input.add_mousedown_handler("DBFlyer.grid",1,mousedown_handler);
        _globs.input.add_move_handler("DBFlyer.grid",1,move_handler);
        _globs.input.add_mouseup_handler("DBFlyer.grid",1,mouseup_handler);


        OBJ.new_join = function(option,hook){
          var _new_join = new JOIN(_globs,{cx: hook.cx,cy: hook.cy});
          if(_new_join.error != undefined && _new_join.error){
          //log('failed');
          //failed.  possibly something in the way
          } else {
            _new_join.save_to_db(function(){_globs.refresh();});
            OBJ.add_obj(_new_join);
            _globs.refresh();
          }
        }
        
        // return the object
        return OBJ;
    
    };


});
