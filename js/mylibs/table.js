
define(['base'],function(BASE){

    return function(globs,options){

        var _globs = globs;
        
        //give this table a position
        var _cells_wide = 0;
        
        var _cell_height = 16;//height of the table cell is one cells
        
        //name is what is shown as the table name

        var _actual_padding = 0;
        var _tab = {up: {x:0,y:0}};
        var _title_x = 0;//relative x position from left of table that they are placed
        
        var _font_height = 12;
        var _tab_size = 12;//size of tab to the left for dragging and options
        var _padding = Math.floor((16-_tab_size)/2);//left and right padding between elements in the table
        
         //could also provide functions:
        // notify: to notify of events like clicking.
        //   called for clicks: notify('mouseup',was_click,hook,mx,my)
        // draw: to draw itself.  passes in globs to get context to draw on
        var OBJ = {
          name: options.name, cx: options.cx, cy: options.cy,

          hooks: [],
          new_hooks: [],//put the new hook profile in this and grid will update itself and move new_hooks => hooks

          //how the grid treats this kind of object
          grid_behavior: {selectable: true,box_selectable: true,draggable: true,unselectable: false},
          active: true,//if it's inactive then it's not interactable
          focus: false,//when this object alone is selected, it is focused

          selected: false,//whether it is selected in the grid
          updating: false,//set to true when its information is being updating in the database
          error: false,

          z:2,

        };

        //OBJ.id is assigned by the grid for all grid objects so we have to call the database id for this table something else
        //  so we call it the db_id
        if(options.db_id !== undefined){
          OBJ.db_id = options.db_id;
        }

        OBJ.type = function(){return "table";}
        
        function set_hooks(cx,cy,hooks){

          if(hooks === undefined){hooks = OBJ.hooks;}

          //find how wide the table needs to be
          _globs.context.font = _font_height+"px Verdana";
          
          var metrics = _globs.context.measureText(OBJ.name);
          OBJ.text_width = metrics.width+8;//+8 for a little breathing room
          
          _cells_wide = Math.ceil((OBJ.text_width+_padding*3+_tab_size)/16);
          
          
          //detect if the new table gets in the way
          for(var i=0;i<_cells_wide;i++){//first check that it can be placed here
            var ret = _globs.grid.get_objects(cx+i,cy,"active");
            if(ret.length != 0){
              return false;
            }
          }
          
          OBJ.cell_width = _cells_wide*16;
          
          _actual_padding = (OBJ.cell_width-(OBJ.text_width+_tab_size))/3;
          //_tab.up.x = Math.round(_actual_padding);//left edge of tab
          _tab.up.x = _padding;//Math.round(_actual_padding);//left edge of tab
          _tab.up.y = 2;
        
          var left_text = _padding+_tab_size+_padding;//left border of the text	
          _title_x = left_text+(OBJ.cell_width-left_text)/2;//center of title
        
          
          for(var i=0;i<_cells_wide;i++){
            hooks.push({cx: cx+i,cy: cy, obj: OBJ});
          }
          
          return true;
        }

        var is_set = set_hooks(OBJ.cx,OBJ.cy);
        
        if(!is_set)
          OBJ.error = true;
         
        
        OBJ.draw = function(ctx,window){
          
          var x = OBJ.cx-window.x*4;
          var y = OBJ.cy-window.y*4;
          
          
          //if(x < 0 || x >= 4*16 || y < 0 || y > 4*12)
          //  throw "table drawing out of bounds";
          
          //x and y in pixels
          var px = x*_globs.cell_size;
          var py = y*_globs.cell_size;

          ctx.save();
          
          //border
          ctx.globalAlpha = (!OBJ.updating ? 1.0 : 0.4);
          ctx.strokeStyle = "#000000";
          ctx.fillStyle = "#ffffff";
          ctx.lineWidth = 1.5;//(OBJ.selected ? 2.5 : 1.5);
          BASE.roundRect(ctx, px+0.5,py+0.5, OBJ.cell_width, _cell_height, 4);
          
          ctx.stroke();
          ctx.globalAlpha = 1.0;
          ctx.fill();

          //up tab
          ctx.globalAlpha = (!OBJ.updating ? 1.0 : 0.4);
          ctx.strokeStyle = "#000000";
          ctx.fillStyle = "#000000";//(OBJ.selected ? "#000000" : "#ffffff");
          ctx.lineWidth = (OBJ.selected ? 1.5 : 0.5);
          BASE.roundRect(ctx, px+_tab.up.x+0.5,py+_tab.up.y+0.5, _tab_size, 16-4, 6);
          if(OBJ.selected){
            ctx.fill();
          } else {
            ctx.stroke();
          }
          
          var vert_float = Math.floor((16-_font_height)/2);//to adjust vertically so it will float in the middle of the box
          var horz_float = Math.floor((OBJ.cell_width-OBJ.text_width)/2);//float horizontally
          
          ctx.globalAlpha = 1.0;
          ctx.fillStyle = "#000000";    
          ctx.font = _font_height+"px Verdana";
          ctx.textAlign = "center"
          ctx.textBaseline = "middle";
          ctx.fillText(OBJ.name,px+_title_x+0.5,py+_cell_height/2-0.5);

          ctx.restore();

        }
        
        
        OBJ.notify = function(event,vars){
          //window,was_click,hook,mx,my
          if(event == 'mouseup'){
            if(!_globs.key.shiftKey){_globs.grid.clear_selected();}
          
            //grid needs to know about it
            _globs.grid.select_obj(OBJ,{select:!OBJ.selected,override:true});
            
            return {notify: false,delete: false};//this means that this object doesn't need notifys that aren't targeted to it
          }
          
          return {};//not a recognized event

        }

        //required for all grid objects
        OBJ.save_to_db = function(callback){

          var o = _globs.db_interface.objects[_globs.slist.picked_database];

          var table_callback = function(id){
            //table is full fledged now
            if(id !== undefined){ OBJ.db_id = id; }
            if(callback !== undefined){callback(id);}
          }

          var pass_vars = {action: "saveObject", database: _globs.slist.picked_database, type: "TABLE", name: OBJ.name, x: OBJ.cx, y: OBJ.cy, width: _cells_wide};

          if(o.table_ids[OBJ.name] !== undefined && o.table_ids[OBJ.name] != -1){
            pass_vars.id = o.table_ids[OBJ.name];
          } else {
          }
          var json = _globs.db_interface.call(table_callback,pass_vars);

        }

        //required for all grid objects
        OBJ.delete_from_db = function(callback){
          if(OBJ.db_id !== undefined){
            var json = _globs.db_interface.call(callback,{action: "deleteObject", id: OBJ.db_id});//name: OBJ.name});
          }
        }

        return OBJ;
        
    };

});
