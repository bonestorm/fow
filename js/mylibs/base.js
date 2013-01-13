
define(function(){

    var OBJ = {};

    /** 
     * Draws a rounded rectangle using the current state of the canvas.  
     * If you omit the last three params, it will draw a rectangle  
     * outline with a 5 pixel border radius  
     * @param {Number} x The top left x coordinate 
     * @param {Number} y The top left y coordinate  
     * @param {Number} width The width of the rectangle  
     * @param {Number} height The height of the rectangle 
     * @param {Object} radius All corner radii. Defaults to 0,0,0,0; 
     * @param {Boolean} fill Whether to fill the rectangle. Defaults to false. 
     * @param {Boolean} stroke Whether to stroke the rectangle. Defaults to true. 
     */
    OBJ.roundRect = function(ctx, x, y, width, height, radius) {
        var cornerRadius = { upperLeft: 0, upperRight: 0, lowerLeft: 0, lowerRight: 0 };
        for (var side in cornerRadius) {
          if (typeof radius === "object" && radius[side] !== undefined) {
            cornerRadius[side] = radius[side];
          } else {
            cornerRadius[side] = radius;
          }
        }

        ctx.beginPath();
        ctx.moveTo(x + cornerRadius.upperLeft, y);
        ctx.lineTo(x + width - cornerRadius.upperRight, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + cornerRadius.upperRight);
        ctx.lineTo(x + width, y + height - cornerRadius.lowerRight);
        ctx.quadraticCurveTo(x + width, y + height, x + width - cornerRadius.lowerRight, y + height);
        ctx.lineTo(x + cornerRadius.lowerLeft, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - cornerRadius.lowerLeft);
        ctx.lineTo(x, y + cornerRadius.upperLeft);
        ctx.quadraticCurveTo(x, y, x + cornerRadius.upperLeft, y);
        ctx.closePath();

    } 

    OBJ.roundTab = function(ctx, x, y, w, h, tab_x, tab_w, tab_h, r) {//w=width,h=height,r=radius

        var c_x,c_y;

        ctx.beginPath();
        c_x = x;            c_y = y+tab_h;
        ctx.moveTo(c_x,c_y+r);
        ctx.quadraticCurveTo(c_x,c_y,c_x+r,c_y);
        c_x += tab_x;
        ctx.lineTo(c_x-r,c_y);
        ctx.quadraticCurveTo(c_x,c_y,c_x,c_y-r);
                            c_y -= tab_h;
        ctx.lineTo(c_x,c_y+r);
        ctx.quadraticCurveTo(c_x,c_y,c_x+r,c_y);
        c_x += tab_w;
        ctx.lineTo(c_x-r,c_y);
        ctx.quadraticCurveTo(c_x,c_y,c_x,c_y+r);
                            c_y += tab_h;
        ctx.lineTo(c_x,c_y-r);
        ctx.quadraticCurveTo(c_x,c_y,c_x+r,c_y);
        c_x = x+w; 
        ctx.lineTo(c_x-r,c_y);
        ctx.quadraticCurveTo(c_x,c_y,c_x,c_y+r);
                            c_y = y+h;
        ctx.lineTo(c_x,c_y-r);
        ctx.quadraticCurveTo(c_x,c_y,c_x-r,c_y);
        c_x -= w; 
        ctx.lineTo(c_x+r,c_y);
        ctx.quadraticCurveTo(c_x,c_y,c_x,c_y-r);
        ctx.closePath();

    } 

    OBJ.openDot = function(ctx,x,y,dot_radius,connect_radius,quad){

      ctx.translate(x,y);
      ctx.rotate((Math.PI/2)*quad);
      ctx.translate(-x,-y);
      ctx.arc(x-connect_radius-dot_radius,y,connect_radius,3*(Math.PI/2),2*Math.PI,false);
      ctx.arc(x,y,dot_radius,Math.PI,0,true);
      ctx.arc(x+connect_radius+dot_radius,y,connect_radius,Math.PI,3*(Math.PI/2),false);
      //ctx.closePath();

    }

    OBJ.cutDown = function(str,limit){
      if(limit === undefined){limit = 100;}
      if(str.length > limit){
        str = str.substr(0,limit-3)+"...";
      }
      return str;
    }

    OBJ.clone = function(obj){
        if(obj == null || typeof(obj) != 'object')
            return obj;

        var temp = new obj.constructor();
        for(var key in obj)
            temp[key] = OBJ.clone(obj[key]);

        return temp;
    }

    OBJ.isString = function(mvar){
        return (typeof mvar == 'string');
    }

    OBJ.stringIsEmpty = function(str){
        return /^\s*$/.test(str);
    }

    OBJ.stringIsNumber = function(str){
        return !isNaN(parseFloat(n)) && isFinite(n);
    }

    return OBJ;

});
