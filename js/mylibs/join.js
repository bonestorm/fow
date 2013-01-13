
define(function(){

    return function(globs,options){

        var _globs = globs;

        
        var _cell_height = _globs.cell_size;//height of the table cell is one cells
        var _cells_wide = 1;

        //name is what is shown as the table name

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

          selected: false,//whether it is selected in the grid
          updating: false,//set to true when its information is being updating in the database
          active: true,//but it's inactive from the viewpoint of the grid, we take care of interaction in this object
          focus: false,//when this object alone is selected, it is focused

          //how the grid treats this kind of object
          grid_behavior: {selectable: false,box_selectable: true,draggable: true,unselectable: true},

          error: false,

          dragging: "",//if a lead is being draggedwhether a lead end is being dragged around
          segs: {hit:[-1,-1],drag:{}},//list of segments and orientation of first segment that a click on a segment hit.  it will be two if clicking on a corner
          dragging_lead_index: 0,//index in OBJ.leads of the lead that is being acted on by dragging
          dragging_orient: 0,//0 for horizontal, 1 for vertical
          lead_start: [0,0],//coords of where the leads start
          lead_end: [0,0],//coords of where the leads end
          leads: [],
       
          link: {},//when a link is established between tables the info goes here

          end_cell: [0,0],//keep track of last mouse position

          z:1//drawn on level 1
        };

        //OBJ.id is assigned by the grid for all grid objects so we have to call the database id for this table something else
        //  so we call it the db_id
        if(options.db_id !== undefined){
          OBJ.db_id = options.db_id;
        }

        if(options.table_from_id !== undefined && options.table_to_id !== undefined){
          OBJ.link = {linked: true,start:options.table_from_id,end:options.table_to_id};
          OBJ.link.start_field = (options.field_from) ? options.field_from : undefined;
          OBJ.link.end_field = (options.field_to) ? options.field_to : undefined;
        }

        OBJ.is_linked = function(){
          if(
OBJ.link !== undefined &&
OBJ.link.linked !== undefined &&
OBJ.link.start !== undefined &&
OBJ.link.end !== undefined &&
OBJ.link.start_field !== undefined &&
OBJ.link.end_field !== undefined 
          ){
            if(
OBJ.link.linked &&
OBJ.link.start.length > 0 &&
OBJ.link.end.length > 0 &&
OBJ.link.start_field.length > 0 &&
OBJ.link.end_field.length > 0
            ){
              return true;
            }
          }
          return false;
        }
        
        OBJ.type = function(){return "join";}

        //object for stepping down every cell in the given leads
        function LeadsIterator(){

          //returns true if leads is exhausted
          this.eat_empty_leads = function(hit_corners){

            //hit_corners = true, iterate through each position of a corner
            //hit_corners = false, iterate through every cell on the leads line
            this.hit_corners = hit_corners;

            while(true){//infinite loop. maybe not a good idea
              if(this.i >= OBJ.leads.length) return true;
              if(OBJ.leads[this.i] != 0) return false;
              this.j = 0;
              this.i++;
              this.orient = 1-this.orient;
            }
          }

          this.reset = function(){
            this.pos = {x:OBJ.cx+OBJ.lead_start[0],y:OBJ.cy+OBJ.lead_start[1]};
            this.orient = 0;//0=horizontal,1=vertical
            this.last_orient = this.orient;
            this.i = 0;//current lead index
            this.j = 0;//current step in current lead
            this.last_one = false;
            this.done = this.eat_empty_leads();//with set this.done to true if there are no non-empty leads
            if(!this.done){
              this.start_target = [this.pos.x,this.pos.y];
              this.start_target[this.orient]  -= (OBJ.leads[this.i] > 0) ? 1 : -1;
            }
          }

          this.reset();//initialize by calling reset

          this.next = function(){

            if(this.last_one){
              this.done = true;
            } else {

              var corner_step = OBJ.leads[this.i];
              var single_step = (OBJ.leads[this.i] > 0) ? 1 : -1;
              var step;
              if(this.hit_corners)
                step = corner_step;
              else
                step = single_step;

              if(this.orient == 0){
                this.pos.x += step;
              } else {
                this.pos.y += step;
              }

              this.j += Math.abs(step);

              var orig_orient = this.orient;

              if(this.j >= Math.abs(OBJ.leads[this.i])) {
                do{
                  this.j = 0;
                  this.i++;

                  this.last_orient = this.orient;
                  this.orient = 1-this.orient;
                }while(OBJ.leads[this.i] == 0);
              }

              this.last_one = this.eat_empty_leads();

              if(this.last_one){//find the point right after the end
                this.end_target = [this.pos.x,this.pos.y];
                this.end_target[orig_orient] += single_step;
              }
            }

          }

          return (this);//for chaining
        }

        
        function last_lead(){
          var num_leads = 0;
          for(var i in OBJ.leads){
            if(OBJ.leads[i] != 0){num_leads++;}
            if(num_leads > 1){return false;}
          }
          return true;
        }

        function smooth(){
          var new_leads = [];
          var i = OBJ.leads.length-1;
          while(i >= 0){
            if(OBJ.leads[i] == 0 && i > 0){//this lead is discarded
              var front;
              if(new_leads.length > 0) {
                front = new_leads[0];
                new_leads.shift();
              } else {
                front = 0;
              }
              i--;
              new_leads.unshift(OBJ.leads[i]+front);
            } else {
              new_leads.unshift(OBJ.leads[i]);
            }
            i--;
          }

          
          OBJ.leads = new_leads;

          //this is to lock in the fact that the first lead is vertical or not
          //because in the middle of shifting a segment it may make the first horizontal lead = 0
          //and that makes the algorithm think that there is no first horizontal lead
          //so we have the algorithm use is_vert_first to determine if it's an actual first vertical lead first situation
          OBJ.is_vert_first = (OBJ.leads[0] == 0);

        }

        function lead_end_orient(){
          return 1-OBJ.leads.length%2;
        }

        
        function find_link(){
          //find if the leads should be interconnecting tables
          //if a connection already exists then see if it needs to be severed
          var start_t = [OBJ.start_target[0],OBJ.start_target[1]];
          var start_ret = _globs.grid.get_objects(start_t[0],start_t[1],"table");
          var end_t = [OBJ.end_target[0],OBJ.end_target[1]];
          var end_ret = _globs.grid.get_objects(end_t[0],end_t[1],"table");
          if(start_ret.length == 1 && end_ret.length == 1){
            var start_obj = start_ret[0].obj;
            var end_obj = end_ret[0].obj;
            //if there's no link or the link is different than the last link
            if(
              OBJ.link === undefined || OBJ.link.linked === undefined || !OBJ.link.linked ||
              OBJ.link.start != start_obj.db_id || OBJ.link.end != end_obj.db_id
            ){
                //completely new link
                OBJ.link = {linked: true,start:start_obj.db_id,end:end_obj.db_id};
                return true;
            }

          } else {
            if(OBJ.link.linked !== undefined && OBJ.link.linked){
              //to unlink you mark it as unlinked but keep the last link info around in case it's relinked
              OBJ.link.linked = false;
            }
          }
          return false;
        }
        
        function set_hooks(cx,cy,hooks){

          if(hooks === undefined){hooks = OBJ.hooks;}

          //find how wide the table needs to be
          _globs.context.font = _font_height+"px Verdana";
          
          //create iterator through every cell that makes the leads
          //pass true for iterator that hits all corners, false to step through every cell
          var liter = new LeadsIterator(false);
          //check for conflicts
          var checked_cells = [];
          while(!liter.done){
            if(liter.pos.x < 0 || liter.pos.y < 0 || liter.pos.x >= _globs.quads_wide*4 || liter.pos.y >= _globs.quads_high*4){
              return false;//out of bounds
            }
            if(checked_cells[liter.pos.x+":"+liter.pos.y] !== undefined){
              return false;
            } else {
              checked_cells[liter.pos.x+":"+liter.pos.y] = 1;
              var ret = _globs.grid.get_objects(liter.pos.x,liter.pos.y,"active");
              //detect if the new table gets in the way
              for(var ret_ind in ret){
                if(ret[ret_ind].obj != OBJ){
                  return false;
                }
              }
            }
            liter.next();
          }
          
          OBJ.cell_width = _cells_wide*16;
          
          _tab.up.x = _padding;
          _tab.up.y = 2;
        
          var left_text = _padding+_tab_size+_padding;//left border of the text	
          _title_x = left_text+(OBJ.cell_width-left_text)/2;//center of title
        

          //hook it into the social pipeline
          liter.reset();//reset the leads iterator to be recycled
          var first = true;
          var count=0;
          while(!liter.done){
            var new_hook = {cx: liter.pos.x,cy: liter.pos.y, obj: OBJ};
            liter.next();
            //first and last cells will get active=false because they are end points and don't want to drag the let the grid drag the join around by them
            if(liter.done || first){new_hook.active = false;}
            hooks.push(new_hook);
            first = false;
            count++;
          }

          //var i=OBJ.leads.length-1;
          //while(i >= 0 && OBJ.leads[i] == 0){i--;OBJ.lead_end_orient = 1-OBJ.lead_end_orient;}
          //log(OBJ.lead_end_orient);
          //log(count+" leads hooked");

          //save the end point of the leads
          OBJ.lead_end = [(liter.pos.x-OBJ.cx),(liter.pos.y-OBJ.cy)];

          OBJ.start_target = liter.start_target;
          OBJ.end_target = liter.end_target;

          find_link();
          
          return true;
        }

        //start with a simple 3 cell horizontal lead
        if(options.leads !== undefined){
          OBJ.lead_start = options.lead_start;
          OBJ.leads = options.leads;
        } else {
          OBJ.lead_start = [-1,0];
          OBJ.leads = [2];
        }

        var is_set = set_hooks(OBJ.cx,OBJ.cy);  
        if(!is_set) OBJ.error = true;

        smooth();//smooths out the leads and sets some variables.  should be done when leads are done editing

        
        OBJ.draw = function(ctx,window){
          
          ctx.save();
          
          var alpha = 0.3;
          if(OBJ.db_id !== undefined){
            alpha += 0.3;
            if(!OBJ.updating){
              alpha += 0.4;
            }
          }

          //border
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = OBJ.focus ? "#ff0000" : "#000000";
          ctx.fillStyle = "#ffffff";
          ctx.lineWidth = (OBJ.selected ? 3.5 : 1.5);
          ctx.beginPath();

          //start of leads in window space
          var lead_pos = {
            x:OBJ.cx+OBJ.lead_start[0]-window.x*4,
            y:OBJ.cy+OBJ.lead_start[1]-window.y*4
          };

          //create iterator through corners of the leads
          //pass true for iterator that hits all corners, false to step through every cell
          var liter = new LeadsIterator(true);
          var first_iter = true;
          //hook it into the social pipeline
          while(!liter.done){

            var px = (liter.pos.x-window.x*4)*_globs.cell_size+_globs.cell_size/2;
            var py = (liter.pos.y-window.y*4)*_globs.cell_size+_globs.cell_size/2;

            if(first_iter)
              ctx.moveTo(px+0.5,py+0.5);
            else
              ctx.lineTo(px+0.5,py+0.5);

            liter.next();
            first_iter = false;
          }
          
          ctx.stroke();
          
          ctx.restore();

          var PI2 = Math.PI*2;

      //DRAW TARGETS
      /*
          _globs.context.save();

          _globs.context.strokeStyle = "#000000";
          _globs.context.lineWidth = 1;
          _globs.context.globalAlpha = 0.5;

          var sx = (liter.start_target[0]-window.x*4)*_globs.cell_size+_globs.cell_size/2;
          var sy = (liter.start_target[1]-window.y*4)*_globs.cell_size+_globs.cell_size/2;

          _globs.context.beginPath();
          _globs.context.arc(sx+0.5,sy+0.5,5,0,PI2,true);
          _globs.context.stroke();
          _globs.context.closePath();

          var ex = (liter.end_target[0]-window.x*4)*_globs.cell_size+_globs.cell_size/2;
          var ey = (liter.end_target[1]-window.y*4)*_globs.cell_size+_globs.cell_size/2;

          _globs.context.beginPath();
          _globs.context.arc(ex+0.5,ey+0.5,5,0,PI2,true);
          _globs.context.stroke();
          _globs.context.closePath();

          _globs.context.restore();
      */
      //DRAW TARGETS

          ctx.save();

          ctx.fillStyle = (OBJ.selected) ? "#000000" : "#FFFFFF";
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 1;
          ctx.globalAlpha = 1;

          var sx = (OBJ.cx+OBJ.lead_start[0]-window.x*4)*_globs.cell_size+_globs.cell_size/2;
          var sy = (OBJ.cy+OBJ.lead_start[1]-window.y*4)*_globs.cell_size+_globs.cell_size/2;

          ctx.beginPath();
          ctx.arc(sx+0.5,sy+0.5,5,0,PI2,true);
          ctx.stroke();
          ctx.fill();
          ctx.closePath();

          var ex = (OBJ.cx+OBJ.lead_end[0]-window.x*4)*_globs.cell_size+_globs.cell_size/2;
          var ey = (OBJ.cy+OBJ.lead_end[1]-window.y*4)*_globs.cell_size+_globs.cell_size/2;

          ctx.beginPath();
          ctx.arc(ex+0.5,ey+0.5,5,0,PI2,true);
          ctx.stroke();
          ctx.fill();
          ctx.closePath();

          ctx.restore();

        }
        

        //find if a straight line segment is clear of objects (that aren't outselves)
        OBJ.clear_cell_ray = function(orient,set_dim,start,end){

          var dims = [0,0];
          if(orient == 0){dims[1] = set_dim;}else{dims[0] = set_dim;}
          var inc = (end > start) ? 1 : -1;
          var iters = Math.abs(end-start);
          var cleared = 0;
          not_cleared:
          for(var cnt=1;cnt<=iters;cnt++){
            if(orient == 0){dims[0] = start+cnt*inc;}else{dims[1] = start+cnt*inc;}
            var ret = _globs.grid.get_objects(OBJ.cx+dims[0],OBJ.cy+dims[1],"active");
            for(var ret_ind in ret){
              //if(ret[ret_ind].obj != OBJ){
                break not_cleared;
              //}
            }
            cleared++;
          }
          return (end > start) ? cleared : -cleared;
        }

        OBJ.add_to_mouse_history = function(vars){
            //log the last 5 mouse positions so we can smartly figure out the corners of the leads
            //mouse position in grid space
            var mx = vars.mx+_globs.grid.window.x*_globs.cell_size;
            var my = vars.my+_globs.grid.window.y*_globs.cell_size;
            var lastx = OBJ.end_cell[0]*_globs.cell_size+_globs.cell_size/2;
            var lasty = OBJ.end_cell[1]*_globs.cell_size+_globs.cell_size/2;

            //add to the history, remove old elements
            OBJ.mouse_hist.unshift({x:vars.mx,y:vars.my});
            if(OBJ.mouse_hist.length > 3){OBJ.mouse_hist.pop();}
        }

        //returns true if the mouse is trying to drag up
        OBJ.is_dragging_orient = function(orient){
          var vert = 0;
          var horz = 0;
          for(var i in OBJ.mouse_hist){
            if(i > 0){
              vert += Math.abs(OBJ.mouse_hist[i-1].y-OBJ.mouse_hist[i].y);
              horz += Math.abs(OBJ.mouse_hist[i-1].x-OBJ.mouse_hist[i].x);
            }
          }
          if(orient == "vertical"){
            return (vert > horz*2);
          }
          if(orient == "horizontal"){
            return (horz > vert*2);
          }
          return false;
        }

        OBJ.make_corner = function(){
          if(OBJ.dragging == "start"){
            //trim beginning of 0's
            while(OBJ.leads[0] == 0 && OBJ.leads[1] == 0){if(OBJ.leads[0] == 0){OBJ.leads.splice(0,2);}}
            if(OBJ.leads[0] == 0){//horizontal empty start, vertical first lead
              OBJ.dragging_orient = 0;//horizontal
              OBJ.dragging_lead_index = 0;
            } else {//horizontal first lead
              OBJ.dragging_orient = 1;//vertical
              OBJ.leads.splice(0,0,0,0);//put two 0's at the beginning
              OBJ.dragging_lead_index = 1;
            }
          }
          if(OBJ.dragging == "end"){
            while(OBJ.leads[OBJ.leads.length-1] == 0){OBJ.leads.pop();}
            if(lead_end_orient() == 0){//horizontal end
              OBJ.dragging_orient = 1;//vertical new lead
            } else {//vertical end
              OBJ.dragging_orient = 0;//horizontal new lead
              //OBJ.leads.splice(0,0,0,0)//put two 0's at the beginning
            }  
            OBJ.leads.push(0);
            OBJ.dragging_lead_index = OBJ.leads.length-1;
          }
        }

        OBJ.number_of_leads = function(){
          var nonempty_leads = 0;
          for(var i in OBJ.leads){
            if(OBJ.leads[i] != 0){nonempty_leads++;}
          }
          return nonempty_leads;
        }

        OBJ.reverse_corner = function(vars){
          if(OBJ.number_of_leads() <= 0){return;}//don't allow editing of last lead
          if(OBJ.dragging == "start"){
            //trim beginning of 0's
            while(OBJ.leads[0] == 0 && OBJ.leads[1] == 0){if(OBJ.leads[0] == 0){OBJ.leads.splice(0,2);}}
            if(OBJ.leads[0] == 0){//horizontal empty start, vertical first lead
              OBJ.dragging_orient = 1;//vertical
              OBJ.dragging_lead_index = 1;
            } else {//horizontal first lead
              OBJ.dragging_orient = 0;//horizontal
              OBJ.dragging_lead_index = 0;
            }
          }
          if(OBJ.dragging == "end"){
            while(OBJ.leads[OBJ.leads.length-1] == 0){OBJ.leads.pop();}
            if(lead_end_orient() == 0){//horizontal end
              OBJ.dragging_orient = 0;//vertical new lead
            } else {//vertical end
              OBJ.dragging_orient = 1;//horizontal new lead
            }  
            OBJ.dragging_lead_index = OBJ.leads.length-1;
          }

          OBJ.mouse_hist = [];//reset mouse history
          OBJ.add_to_mouse_history(vars);

        }

        OBJ.focus_notify = function(focusing){
          //if focusing is false then it's unfocusing
          if(focusing){
            if(OBJ.db_id !== undefined){
              _globs.slist.start_input_type("join",OBJ);//still needs to meet criteria
            }
          } else {
            _globs.slist.clear_input_type("join");
          }
        }

        OBJ.select_notify = function(selected){
          if(selected){
            //OBJ.active = true;//from the viewpoint of the grid we want it to take over this join as long as it's selected
          } else {
            //OBJ.active = false;
          }
        }

        //neighbor is moving in next to us, it could mean a link so find a link
        OBJ.neighbor_notify = function(){
          if(OBJ.link === undefined || OBJ.link.linked === undefined || !OBJ.link.linked){
            set_hooks();//has side effect of finding starting and ending targets.  better way to do this?
            if(find_link(OBJ.cx,OBJ.cy)){
              OBJ.save_to_db();
            }
          }
        }
        
        OBJ.notify = function(event,vars){


          //window,was_click,hook,mx,my
          if(event == 'mouseup'){

            //this means that this object doesn't need notifys that aren't targeted to it
            var ret = {notify: false,delete: false,modal: true};

            smooth();//smooths the leads out

            if(!OBJ.moved_cell){//didn't move out of a cell so consider it a click
              if(OBJ.waiting_double_click !== undefined && OBJ.waiting_double_click){//double click
                OBJ.double_click = true;
                if(OBJ.dragging == "segment"){
                  if(OBJ.segs.hit_seg !== undefined){
                    var seg = OBJ.leads[OBJ.segs.hit_seg];
                    var cell = OBJ.segs.hit_cell;
                    var back = (seg > 0) ? cell : -cell;
                    var front = seg-back;
                    OBJ.leads.splice(OBJ.segs.hit_seg,1,back,0,front);
                    ret.refresh = true;
                  }
                }
              } else {//set up the double click detector
                OBJ.waiting_double_click = true;
                OBJ.double_click = false;
                setTimeout(function(){
                  //timed out an no double click
                  if(OBJ.double_click !== undefined && !OBJ.double_click){

                    //simple click
                    if(!_globs.key.shiftKey){ret.refresh = _globs.grid.clear_selected();}
                    _globs.grid.select_obj(OBJ,{select:true,override:true});

                    //OBJ.active = true;

                    _globs.refresh();
                  }
                  OBJ.waiting_double_click = false;
                },300);
              }
            } else {
              OBJ.save_to_db();
            }

            OBJ.dragging = "";
            return ret;

          }
          if(event == 'mousedown'){

            if(OBJ.selected){
              var ret = {notify: false,delete: false,modal: true};
            } else {

              if(vars.cx == OBJ.cx+OBJ.lead_start[0] && vars.cy == OBJ.cy+OBJ.lead_start[1]){
                OBJ.dragging = "start";
                OBJ.make_corner();
              } else {
                if(vars.cx == OBJ.cx+OBJ.lead_end[0] && vars.cy == OBJ.cy+OBJ.lead_end[1]){
                  OBJ.dragging = "end";
                  OBJ.make_corner();
                } else {
                  OBJ.dragging = "segment";
                  OBJ.segs = {hit:[-1,-1]};//index 0 is horizontal hit segment, 1 is vertical.  -1 there if no hit segment for that orientation
                  var liter = new LeadsIterator(false);
                  while(!liter.done){
                    if(liter.pos.x < 0 || liter.pos.y < 0 || liter.pos.x >= _globs.quads_wide*4 || liter.pos.y >= _globs.quads_high*4){
                      break;
                    }
                    if(vars.cx == liter.pos.x && vars.cy == liter.pos.y){
                      if(liter.j == 0 && liter.i > 0){
                        OBJ.segs.hit[1-liter.last_orient] = liter.i-1;
                        OBJ.segs.hit[liter.last_orient] = liter.i;
                      } else {
                        if(liter.i == 0 && !OBJ.is_vert_first){
                          OBJ.segs.hit[1] = liter.i;
                        } else {
                          OBJ.segs.hit[liter.last_orient] = liter.i;
                        }
                        OBJ.segs.hit_seg = liter.i;
                        OBJ.segs.hit_cell = liter.j;
                      }
                    }
                    liter.next();
                  }
                }
              }
              if(OBJ.dragging.length > 0){
                OBJ.end_cell = [vars.cx,vars.cy];
              }

              OBJ.moved_cell = false;//to detect if it's just a click or double click
              OBJ.mouse_hist = [];//reset mouse history
              OBJ.add_to_mouse_history(vars);

              return {notify: true,modal: true}; 

            }

          }
          if(event == 'mousemove'){

            var ret = {notify: true,modal: true};

            if(OBJ.dragging.length > 0){

              var move_dims = [(vars.cx-OBJ.end_cell[0]),(vars.cy-OBJ.end_cell[1])];

              if(move_dims[0] != 0 || move_dims[1] != 0){
                OBJ.moved_cell = true;
              }

              if(OBJ.dragging == "segment"){

                if(OBJ.segs.drag === undefined){
                  if(move_dims[0] != 0 && OBJ.segs.hit[0] != -1){
                    OBJ.segs.drag = {orient: 0,dis: [0,0]};
                  } else {
                    if(move_dims[1] != 0 && OBJ.segs.hit[1] != -1){
                      OBJ.segs.drag = {orient: 1,dis: [0,0]};
                    }
                  }
                }
                if(OBJ.segs.drag !== undefined){
                  var move = move_dims[OBJ.segs.drag.orient];
                  if(move != 0){
                    var seg = OBJ.segs.hit[OBJ.segs.drag.orient];
                    OBJ.segs.drag.dis[OBJ.segs.drag.orient] += move_dims[OBJ.segs.drag.orient];

                    function shift_lead(amount){
                      if((seg == 0 && OBJ.segs.drag.orient == 1) ||
                        (seg == 1 && OBJ.segs.drag.orient == 0 && OBJ.is_vert_first)
                      ){
                        OBJ.lead_start[OBJ.segs.drag.orient] += amount;
                      } else {
                        OBJ.leads[seg-1] += amount;
                      }
                      if(seg < OBJ.leads.length-1){OBJ.leads[seg+1] -= amount;}
                    }

                    shift_lead(move);

                    var is_set = set_hooks(OBJ.cx,OBJ.cy,OBJ.new_hooks);
                    if(!is_set) {
                      OBJ.error = true;ret.error = true;
                      //undo the change
                      shift_lead(-move);
                    } else {
                      OBJ.end_cell = [vars.cx,vars.cy];
                    }
                    ret.refresh = true;

                  }
                }


              } else {
                //dragging the start or end
                OBJ.add_to_mouse_history(vars);

                if(move_dims[0] != 0 || move_dims[1] != 0){

                  var drag = OBJ.dragging_orient;
                  var move = move_dims[drag];
                  var start_end = (OBJ.dragging == "end") ? -1 : 1;
                  var lead_point = (OBJ.dragging == "end") ? OBJ.lead_end : OBJ.lead_start;
                  if(move != 0){
                    var cleared;
                    if(OBJ.leads[OBJ.dragging_lead_index]*move*start_end > 0){
                      cleared = move;//reducing the lead so no chance of hitting something
                    } else {
                      cleared = OBJ.clear_cell_ray(drag,lead_point[1-drag],lead_point[drag],lead_point[drag]+move);
                    }
                    var adjust = -cleared*start_end;
                    //see if adjustment results in all leads disappearing
                    if(last_lead() && OBJ.leads[OBJ.dragging_lead_index] + adjust == 0){
                      //leave a single length segment
                      adjust = (adjust > 0) ? (adjust-1) : (adjust+1);
                    } else {
                      //okay to make adjustment
                      OBJ.leads[OBJ.dragging_lead_index] += adjust;
                    }
                    if(OBJ.dragging == "start"){lead_point[drag] -= adjust;}
                  }

                  //constrain here
                  var is_set = set_hooks(OBJ.cx,OBJ.cy,OBJ.new_hooks);
                  if(!is_set) {OBJ.error = true;ret.error = true;}
                  ret.refresh = true;

                  if(OBJ.dragging == "end"){
                    OBJ.end_cell = [OBJ.cx+OBJ.lead_end[0],OBJ.cy+OBJ.lead_end[1]];
                  }
                  if(OBJ.dragging == "start"){
                    OBJ.end_cell = [OBJ.cx+OBJ.lead_start[0],OBJ.cy+OBJ.lead_start[1]];
                  }

                  //after updating the lead...
                  //see if you need to make a corner
                  //OBJ.is_dragging_orient looks through the mouse history and sees which orientation we're dragging
                  if(drag == 0){
                    if(OBJ.leads[OBJ.dragging_lead_index] != 0){
                      if(OBJ.is_dragging_orient("vertical")){//horizontal
                        OBJ.make_corner();
                      }
                    } else {
                      if(move_dims[1] != 0){
                        OBJ.reverse_corner(vars);
                      }
                    }
                  } else {
                    if(OBJ.leads[OBJ.dragging_lead_index] != 0){
                      if(OBJ.is_dragging_orient("horizontal")){//vertical
                        OBJ.make_corner();
                      }
                    } else {
                      if(move_dims[0] != 0){
                        OBJ.reverse_corner(vars);
                      }
                    }
                  }
                  
                }
              }

              return ret;
            }
          }

          return {};//not a recognized event

        }

        //required for all grid objects
        OBJ.save_to_db = function(callback){

          var table_callback = function(id){
            //table is full fledged now
            if(id !== undefined){OBJ.db_id = id;}

            //see if it's a good point to start composing a query
            if(OBJ.selected){
              var is_set = _globs.composer.set_starting_point(OBJ);
              if(is_set){_globs.refresh();}
            }

            if(callback !== undefined){callback(id);}

          }

          var pass_vars = {
            action: "saveObject",
            type: "JOIN",
            database: _globs.slist.picked_database,//will be converted to table_schema_id
            id: OBJ.db_id,//if this is empty, does an insert, if it's there, does an update
            x: OBJ.cx, y: OBJ.cy,
            leads: "[" + OBJ.leads.join(',') + "]",
            lead_start: "[" + OBJ.lead_start.join(',') + "]",
            table_from_id: OBJ.link.start,
            field_from: OBJ.field_from_id,
            table_to_id: OBJ.link.end,
            field_to: OBJ.field_to
          };

          if(OBJ.link !== undefined){
            pass_vars.table_from_id = OBJ.link.start;
            pass_vars.table_to_id = OBJ.link.end;
            if(OBJ.link.start_field !== undefined){pass_vars.field_from = OBJ.link.start_field;}
            if(OBJ.link.end_field !== undefined){pass_vars.field_to = OBJ.link.end_field;}
          }

          //if(OBJ.db_id !== undefined){
            //pass_vars.db_id = OBJ.db_id;
          //}


          var json = _globs.db_interface.call(table_callback,pass_vars);

        }

        //required for all grid objects
        OBJ.delete_from_db = function(callback){
          if(OBJ.db_id !== undefined){
            var json = _globs.db_interface.call(callback,{action: "deleteObject", id: OBJ.db_id});
          } else {
            callback();
          }
        }

        return OBJ;
      
    }


});
