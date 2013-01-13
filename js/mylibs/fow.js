
//Full On Windows
//Full On Windows
//Full On Windows

define(['jquery','prototype','base'],function($j,Prototype,BASE){


    //function Node(initParent,initChilds){
    var Node = Class.create({

        initialize: function(initParent,initChilds){

            this.myClass = 'Node';
            this.mixins = [];

            this.childs = [];
            this.childsMap = {};//key,values for any named child nodes. key is the name and value is the index into childs where it lives
            this.childsInvMap = {};

            this.base = (initParent instanceof Node) ? initParent : undefined;//parent node, undefined if it's the root
            
        },

        registerChild: function(newChildId){
            if(newChildId && BASE.isString(newChildId) && !BASE.stringIsEmpty(newChildId)){
                this.childsMap[newChildId] = this.childs.length-1;
                this.childsInvMap["c"+this.childsMap[newChildId]] = newChildId;
                return true;
            } else {
                return false;
            }
        },

        addChild: function(child,newChildId){//both parameters are optional 

            //childId can be a Node or a string identifier for a Node we create
            var newChild = (child && (child instanceof Node)) ? child : (new Node(this));

            this.childs.push(child);

            this.registerChild(newChildId);//give the child this identifier if there is one provided

            return newChild;
        },

        removeChild: function(childId){

            var remInd;

            if(childId instanceof Node){//match objects
                //for(var n in this.childs){
                for(var n=0;n<this.childs.length;n++){
                    if(childId === this.childs[n]){
                        remInd = n;//mark to delete from child node array
                        if(this.childsInvMap["c"+n] !== undefined){delete this.childsInvMap["c"+n];}
                        break;
                    }
                }
            } else if(BASE.isString(childId)){//childId could be a key in childsMap or just an index
                if(this.childsMap[childId] !== undefined){
                    remInd = this.childsMap[childId];//mark to delete from child node array
                    delete this.childsMap[childId];
                    delete this.childsInvMap["c"+n];
                } else if(this.childs[childId] !== undefined) {
                    remInd = this.childs[childId];
                }
            }

            //remove from child node array
            if(remInd !== undefined){
                this.childs.splice(remInd,1);
                return true;
            } else {
                return false;
            }


        },

        setParent: function(newParent){
            this.base = newParent;
        },

    });


    var Window = Class.create(Node, {

        initialize: function($super){
            $super();
            this.myClass = 'Window';

            //this.pos;//0: {{x}}, 1: {{y}}
            //this.dims;//0: {{width}}, 1: {{height}}
            //this.realPos;//like pos and dims but in actual pixel values since pos and dims can be percentages of their parent windows
            //this.realDims;

            this.clients = [];;//injected dependent.  must have a draw method that is called to redraw itself
        },
  
        setCoords: function(newPos,newDims){
            this.pos = newPos;
            this.dims = newDims;
        },
        addClient: function(newClient){
            this.clients.push(newClient);
        },
        removeclient: function(remClient){
            var remIndex = $j.inArray(this.clients,remClient);
            if(remIndex != -1){this.clients.splice(remIndex,1);}
        },
        drawRecursive: function(ctx,extraAction){

            if(ctx === undefined){ctx = this.context;}

            ctx.save();

            if(this.myClass != "Canvas"){//canvases are already positioned
                ctx.translate(this.realPos[0],this.realPos[1]);//simple translation
console.log(this.class);
            }

            //bottom windows should be cleared
            if(extraAction == "clear"){
                ctx.globalAlpha = 1.0;
                ctx.clearRect(0,0,this.realDims[0],this.realDims[1]);
            }

            //for(var i in this.clients){
            for(var i=0;i<this.clients.length;i++){
                if(this.clients[i].draw !== undefined){
                    this.clients[i].draw(ctx,this.realDims);
                }
            }

            //for(var i in this.childs){
            for(var i=0;i<this.childs.length;i++){
                this.childs[i].drawRecursive(ctx);
            }
        
            ctx.restore();

        },

        //it might be a percentage or pixels, return the right value
        getRealMetric: function(setting,bounds){
            var percent = /(\d*\.?\d*)\%$/;
            var reg_res;
            if(reg_res = setting.match(percent)){
                return Math.floor(bounds*(reg_res[1]/100));
            } else {
                return setting;
            }
        },

        resizeSelf: function(newParentBounds){
            this.realPos =  [this.getRealMetric(this.pos[0], newParentBounds[0]),this.getRealMetric(this.pos[1], newParentBounds[1])];
            this.realDims = [this.getRealMetric(this.dims[0],newParentBounds[0]),this.getRealMetric(this.dims[1],newParentBounds[1])];
            return this.realDims;
        },

        resizeRecursive: function(newParentBounds){

            //default to the size of the browser window
            if(newParentBounds === undefined){newParentBounds = [$j(window).width(),$j(window).height()];}

            var newBounds = this.resizeSelf(newParentBounds);

            for(var i=0;i<this.childs.length;i++){
                this.childs[i].resizeRecursive(newBounds);
            }

        },

        resize: function(newBounds){ this.resizeRecursive(newBounds); }

    });


    //top dog, keeps canvas, context, and gets/sends event notifications
    var Canvas = Class.create(Window, {//canvasId is the name of the id of the canvas element
        initialize: function($super,canvasId){
            $super();
           
            this.myClass = 'Canvas'; 
            this.canvasElem = $j("#"+canvasId);
            this.canvas = document.getElementById(canvasId);
            this.context = this.canvas.getContext("2d");

        },

        resetCanvas: function(){
            this.canvasElem.offset({top:this.realPos[1],left:this.realPos[0]});
            this.canvas.width = this.realDims[0];
            this.canvas.height = this.realDims[1];
            //this.canvasElem.width(this.realDims[0]);
            //this.canvasElem.height(this.realDims[1]);
        },
        
        draw: function(ctx,extraAction){ this.drawRecursive(ctx,extraAction); },
        refresh: function(){ this.resizeRecursive();this.drawRecursive(); }

    });


    //give the Node the added ability to get resize events
    var makeRoot = function(node){
        Object.extend(node,{
            initialize: function(){
                this.mixins.push('Root');
                var self = this;
                this.resizeEventClosure = function(){self.resizeEvent();}
            },
            resizeEvent: function(){
                if(this.myClass == 'Node'){
                    for(var i=0;i<this.childs.length;i++){
                        this.childs[i].resize();

                        this.childs[i].drawRecursive(undefined,"clear");
                    }
                } else if(this.myClass == 'Canvas'){
                    this.resize();
                    this.resetCanvas();
                    this.drawRecursive(undefined,"clear");
                }
            },
            attachResizeEvent: function(){
                $j(window).bind('resize',this.resizeEventClosure);
            },
            detachResizeEvent: function(){
                $j(window).unbind('resize',this.resizeEventClosure);
            }
        });
        node.initialize();
    }

    function buildNodeStructure(plan,canvasId){

        //plan is the complex data structure, instructing buildNodeStructure how to create the node structure and the client objects attached to them, etc.

        //[
        //this example shows more than one root window but typically there is only one root window
        /*
        var client1 = {};//pretend this is an object with tons of cool stuff in it
        var client2 = {};//pretend this is an object with tons of cool stuff in it
        var client3 = {};//pretend this is an object with tons of cool stuff in it
        var client4 = {};//pretend this is an object with tons of cool stuff in it
        var client5 = {};//pretend this is an object with tons of cool stuff in it

        var plan = //always an array even if only one root window
        [
            {id: 'root window 1', pos: [0,0], dims: [500,200], client: client5, subs:
                [
                    {pos: [10,100], dims: [20,20], client: client1},//client1 gets a draw notification when it's time to draw this window
                    {id: 'sub window 2', pos: [100,10], dims: [40,20], client: client2, subs: {id: 'sub sub window', pos: [5,5], dims: [5,10]}},
                ]
            },
            {id: 'root window 2', pos: [50,200], dims: [400,200], client: client4, subs:
                [
                    {id: 'sub window 1', pos: [20,40], dims: [20,5] client: client3, subs: {id: 'sub sub window', pos: [5,5], dims: [5,10]}},
                ]
            },
        ]
        */

        this.pushOnNode = function(parentNode,subPlan,canvasId){//if canvasId is null then it needs to be provided in the root window as {canvasId: {{canvas_id}},...}

            for(var i=0;i<subPlan.length;i++){

                var usedCanvasId = (canvasId !== undefined) ? canvasId : ((subPlan[i].canvasId !== undefined) ? subPlan[i].canvasId : undefined);

                //make fresh node
                var newNode;
                if(usedCanvasId !== undefined){
                    newNode = new Canvas(usedCanvasId);
                } else {
                    newNode = new Window();
                }

                //add to parent
                parentNode.addChild(newNode);

                //set coordinates of window
                if(subPlan[i].dims !== undefined){
                    var usedPos = (subPlan[i].pos !== undefined) ? subPlan[i].pos : [0,0];
                    newNode.setCoords(usedPos,subPlan[i].dims);
                }

                //add clients
                var clients = (subPlan[i].client !== undefined) ? subPlan[i].client : ((subPlan[i].clients !== undefined) ? subPlan[i].clients : undefined);
                if(!$j.isArray(clients)){clients = [clients];}

                for(var j in clients){
                    newNode.addClient(clients[j]);
                }

                //add decorators Resize and Grid if we need to
                //add decorators Resize and Grid if we need to

                //add another level if there is one
                if(subPlan[i].subs !== undefined){
                    this.pushOnNode(newNode,subPlan[i].subs);
                }

            }
            
        }

        //root node is just a simple Node and is not attached to any window, just keeps child root node references
        this.root = new Node();
        this.pushOnNode(this.root,plan,canvasId);//recursively build the node structure

        //if there really is only a single root node in the plan then we just discard this bare node for its child, which is the real root node
        if(plan.length == 1){
            if(this.root === undefined || this.root.childs === undefined || this.root.childs[0] === undefined){
                alert("Error creating the node structure!");
            } else {
                //discard this root node for the real one
                this.root = this.root.childs[0];
            }
        }


        //extend this Node object and make it a Root object
        makeRoot(this.root);
        this.root.attachResizeEvent();
        this.root.resizeEvent();//sets all the window's dimensions

        
    }


    return {
        create: buildNodeStructure
    };


});

     
      
        

