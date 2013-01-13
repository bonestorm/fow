
define(['base'],function(BASE){

     //all input_* functions here are different input sections in the slist
     //they all follow a pattern.  they all have a width
            
    return {
    input_dropdown:  function(globs,options){

        var _globs = globs;

        //data is the options in the dropdown
        //callback is called when an option is picked

        this.title = options.title;
        if(options.show_title !== undefined || options.show_title){
          this.show_title = ((this.title !== undefined && this.title.length > 0) ? true : false);
        } else {
          this.show_title = false;
        }

        this.data = options.data;//list of options
        this.height = options.height;
        this.callback = options.callback;

        this.dropped = 0;
        this.footprint = [];
        this.bounds = {};//bounding box of all footprints
        this.scrollbar = undefined;

        this.hit_option = 0;//set to > 0 when an option is picked
        this.picked = (options.picked !== undefined) ? options.picked : "";//the element in options.data that was picked.  passed back in the callback

        this.reset = function(){this.dropped = 0;this.picked = "";this.hit_option = 0;}

        this.start_option = 0;//for pagination
        this.page_size = 15;//number of options to show for a single page
        if(options.page_size !== undefined){
          this.page_size = options.page_size;
        }

        //not sophisticated, but will do for now
        this.option_width = 200;
        this.scroll_width = 26;
        this.width = this.option_width+this.scroll_width;

        this.needs_scrolling = function(){
          return this.data.length > this.page_size;
        }

        this.set_data = function(data){

          //the new data may have an option that is the picked option so select it
          for(var i in data){
            if(data[i] == this.picked){
              this.hit_option = i+1;
            }
          }
          this.data = data;
          if(this.start_option+this.page_size > this.data.length){this.set_to_last_page();}
          this.bounds = []
          this.get_footprint();
        }

        this.add_foot_to_bounds = function(foot){
          if(this.bounds.x === undefined || this.bounds.x > foot.x){this.bounds.x = foot.x;}
          if(this.bounds.y === undefined || this.bounds.y > foot.y){this.bounds.y = foot.y;}
          var rx = foot.x+foot.width;
          var ry = foot.y+foot.height;
          var bx = this.bounds.x+this.bounds.width;
          var by = this.bounds.y+this.bounds.height;
          if(this.bounds.width === undefined || bx < rx){this.bounds.width = rx-this.bounds.x;}
          if(this.bounds.height === undefined || by < ry){this.bounds.height = ry-this.bounds.y;}
        }

        this.get_footprint = function(){
          this.footprint = [];
          //this.bounds = {};//x,y,width,height of bounding box of all footprints
          var new_y = 0;

          //push on the section square
          this.footprint.push({x:0,y:new_y,width:this.option_width+this.scroll_width,height:this.height});


          var option_width = this.option_width;
          if(this.data.length <= this.page_size){
            option_width += this.scroll_width;
          }

          if(this.dropped > 0){

            new_y += this.height;
            //push on all the dropdown's options
            for(var i=this.start_option;i<this.start_option+this.page_size && i<this.data.length;i++){
              var foot = {x:0,y:new_y,width:option_width,height:this.height,option:this.data[i]};
              this.add_foot_to_bounds(foot);
              this.footprint.push(foot);
              new_y += this.height;
            }

            if(!this.needs_scrolling()){
              this.scrollbar = undefined;
            } else {
              this.scrollbar = {
                x:this.bounds.x+this.bounds.width,y:this.bounds.y,
                width:this.scroll_width,height:this.bounds.height
              };
              //up and down arrows
              var arrow_height = this.scroll_width;
              this.scrollbar.up = {x:this.scrollbar.x,y:this.scrollbar.y,width:this.scrollbar.width,height:arrow_height};
              this.scrollbar.inner = {x:this.scrollbar.x,y:this.scrollbar.y+arrow_height,width:this.scrollbar.width,height:this.scrollbar.height-arrow_height*2};
              this.scrollbar.down = {x:this.scrollbar.x,y:this.scrollbar.y+this.scrollbar.height-arrow_height,width:this.scrollbar.width,height:arrow_height};
            }
          }

        }

        this.set_to_last_page = function(){
          this.start_option = this.data.length-this.page_size;
          if(this.start_option < 0){this.start_option = 0;}
      /*
          var first_opt = ((this.page-1)*this.page_size);
          if(first_opt >= this.data.length){//too big
            var last_bit = this.data.length%this.page_size;
            first_opt = this.data.length - ((last_bit == 0) ? this.page_size : last_bit);
          }
          this.page = 1+Math.floor(first_opt/this.page_size);
      */
        }

        this.advance_page = function(advance){
          this.start_option += advance;
          if(this.start_option < 0){
            this.start_option = 0;
          } else {
            if(this.start_option+this.page_size > this.data.length){this.set_to_last_page();}
          }
      /*
          this.page += advance;
          if(this.page < 1){this.page = 1;} else {this.set_to_last_page();}
      */
        }

        this.wheel = function(x,y,delta){

          if(
            x >= this.bounds.x && y >= this.bounds.y && 
            x <= this.bounds.x+this.bounds.width && y <= this.bounds.y+this.bounds.height
          ){
            //log("bounds: "+this.bounds.x+":"+this.bounds.y+"  --  "+this.bounds.width+":"+this.bounds.height);
            //log("wheel: "+x+":"+y);
            var advance = -delta;
            this.advance_page(advance);
          }
        }

        this.hit = function(event,x,y){

          this.get_footprint();

          if(this.footprint !== undefined){
          
            //sections could have a list of footprints that might be hit
            for(var j in this.footprint){
              var foot = this.footprint[j];
              if(j > 0 && this.dropped == 0){break;}//if it's not dropped down then only detect on the option box
              if(x < foot.x+foot.width && x >= foot.x && y < foot.y+foot.height && y >= foot.y){
                this.hit_option = j;

                //drop the options down
                if(event == "down"){
                  if(this.dropped == 0 && this.hit_option == 0){
                    this.dropped++;
                    return true;
                  }
                  if(this.dropped == 2){
                    this.dropped++;
                    return true;
                  }
                }
                if(event == "up"){
                  if(this.hit_option > 0){//j == 0 is clicking the original dropdown window
                    this.dropped = 0;
                    this.bounds = [];//only reset bounds when stopping dropdown
                    this.picked = this.footprint[this.hit_option].option;
                    this.callback(this.picked);
                  } else {
                    if(this.dropped == 1){
                      this.dropped++;
                    } else {
                      if(this.dropped == 3){
                        this.dropped = 0;
                      }
                    }
                  }
                  return true;
                }
              }
            }

            if(event == "down" && this.scrollbar !== undefined && this.dropped > 0){
              var hit_scrollbar;
              function clicked_on_arrow(obj,arrow,callback){
                if(x < arrow.x+arrow.width && x >= arrow.x && y < arrow.y+arrow.height && y >= arrow.y){
                  hit_scrollbar = true;
                  callback(obj);
                }
              }
              clicked_on_arrow(this,this.scrollbar.up,function(obj){
                obj.advance_page(-1);
              });
              clicked_on_arrow(this,this.scrollbar.down,function(obj){
                obj.advance_page(1);
              });
              clicked_on_arrow(this,this.scrollbar.inner,function(obj){
                alert("INNER!");
              });
              return hit_scrollbar;
            }
            
          }

          return false;
        }

        this.hit_footprint = function(){
          this.get_footprint(x);
      //stuff in here
        }

        this.draw = function(ctx){

          this.get_footprint();

          //original dropdown rect
          var drop_rect = [this.footprint[0].x+0.5,this.footprint[0].y+0.5, this.footprint[0].width, this.footprint[0].height];

          ctx.strokeStyle = "#000000";
          ctx.fillStyle = "#ffffff";
          ctx.lineWidth = 1;
          BASE.roundRect(ctx, drop_rect[0], drop_rect[1], drop_rect[2], drop_rect[3], 3);
          ctx.stroke();
          ctx.globalAlpha = 1.0;
          ctx.fill();

          var title;
          if(this.show_title && this.hit_option == 0){
            title == this.title;
          } else {
            if(this.picked != ""){
              title = this.picked;
            }
          }

          if(title !== undefined){
            ctx.fillStyle = "#000000";
            ctx.font = "12px Verdana";
            ctx.textAlign = "left"
            ctx.textBaseline = "middle";
            ctx.fillText(title,drop_rect[0]+5,drop_rect[1]+Math.floor(this.height/2));
          }

          //dropdown line and arrow
          var half_height = Math.floor(drop_rect[3]/2);

          ctx.strokeStyle = "#000000";
          ctx.fillStyle = "#000000";
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          var sw = this.scroll_width;
          ctx.moveTo(drop_rect[0]+drop_rect[2]-sw,drop_rect[1]+3);
          ctx.lineTo(drop_rect[0]+drop_rect[2]-sw,drop_rect[1]+drop_rect[3]-3);
          ctx.moveTo(drop_rect[0]+drop_rect[2]-sw/2-5,drop_rect[1]+half_height-3);
          ctx.lineTo(drop_rect[0]+drop_rect[2]-sw/2,drop_rect[1]+half_height+3);
          ctx.lineTo(drop_rect[0]+drop_rect[2]-sw/2+5,drop_rect[1]+half_height-3);
          ctx.closePath();
          ctx.stroke();
          ctx.globalAlpha = 1.0;
          ctx.fill();

          if(this.dropped > 0){

            //dropdown options
            var new_y = this.height;
            for(var i in this.footprint){

              if(i == 0){continue;}//first option is just the section box

              ctx.save();

              ctx.strokeStyle = "#000000";
              ctx.fillStyle = "#ffffff";
              ctx.lineWidth = 0.5;

              BASE.roundRect(ctx,this.footprint[i].x+0.5,this.footprint[i].y+0.5, this.footprint[i].width, this.footprint[i].height, 4);
              ctx.stroke();
              ctx.globalAlpha = 1.0;
              ctx.fill();

              ctx.clip();//clip by the rec

              ctx.fillStyle = "#000000";
              ctx.font = "12px Verdana";
              ctx.textAlign = "left"
              ctx.textBaseline = "middle";
              ctx.fillText(this.footprint[i].option,this.footprint[i].x+5+0.5,this.footprint[i].y+Math.floor(this.footprint[i].height/2)+0.5);

              ctx.restore();

              new_y += this.height;

            }

            if(this.scrollbar !== undefined){

              function draw_scrollbar_part(part){
                ctx.save();

                ctx.strokeStyle = "#000000";
                ctx.fillStyle = "#ffffff";
                ctx.lineWidth = 0.5;

                BASE.roundRect(ctx,part.x+0.5,part.y+0.5,part.width,part.height, 4);
                ctx.stroke();
                ctx.globalAlpha = 1.0;
                ctx.fill();

      /*
                ctx.clip();//clip by the rec

                ctx.fillStyle = "#000000";
                ctx.font = "12px Verdana";
                ctx.textAlign = "left"
                ctx.textBaseline = "middle";
                ctx.fillText(this.footprint[i].option,this.footprint[i].x+5+0.5,this.footprint[i].y+Math.floor(this.footprint[i].height/2)+0.5);

      */
                ctx.restore();
              }

              //draw scrollbar
              if(this.needs_scrolling()){
                draw_scrollbar_part(this.scrollbar.up);
                draw_scrollbar_part(this.scrollbar.inner);
                draw_scrollbar_part(this.scrollbar.down);        
              }
            } 

          }

        }

        this.set_data(this.data);

    },

    //just for showing some text as a section in a slist
    input_title: function(globs,options){

        var _globs = globs;

        //callback is called when an option is picked

        this.title = options.title;//the text shown

        this.height = options.height;
        this.padding = (options.padding !== undefined) ? options.padding : 5;//left and right padding
        this.callback = options.callback;

        this.footprint = [];

        var ctx = _globs.context;
        ctx.font = "12px Verdana";
        var metrics = ctx.measureText(this.title);
        this.width = metrics.width+this.padding*2;

        this.get_footprint = function(){
          this.footprint = [];

          var new_y = 0;

          //push on the section square
          this.footprint.push({x:0,y:new_y,width:this.option_width,height:this.height});

        }

        this.hit = function(event,x,y){

          this.get_footprint();

          if(this.footprint !== undefined){
            for(var j in this.footprint){
              var foot = this.footprint[j];
              if(x < foot.x+foot.width && x >= foot.x && y < foot.y+foot.height && y >= foot.y){
                this.callback();
                return true;
              }
            }
          }
          return false;
        }


        this.draw = function(ctx){

          this.get_footprint();

          //original dropdown rect
          var drop_rect = [this.footprint[0].x+0.5,this.footprint[0].y+0.5, this.footprint[0].width, this.footprint[0].height];

      /*
          ctx.strokeStyle = "#000000";
          ctx.fillStyle = "#ffffff";
          ctx.lineWidth = 1;
          BASE.roundRect(ctx, drop_rect[0], drop_rect[1], drop_rect[2], drop_rect[3], 3);
          ctx.stroke();
          ctx.globalAlpha = 1.0;
          ctx.fill();
      */

          ctx.fillStyle = "#000000";
          ctx.font = "12px Verdana";
          ctx.textAlign = "left"
          ctx.textBaseline = "middle";
          ctx.fillText(this.title,drop_rect[0]+this.padding,drop_rect[1]+Math.floor(this.height/2));

        }

    }};


});
