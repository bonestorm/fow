
require.config({
    baseUrl: '/js/mylibs',
    paths: {
        'prototype': '/js/libs/prototype',
        'jquery': '/js/libs/jquery-1.6.2.min'
    },
    shim: {
        'prototype': { exports: 'Prototype' },
        'jquery': { exports: 'jQuery' }
    }
});

$.ajaxSetup ({  cache: false  });  

require(['jquery',"base","fow"],function($j,BASE,FOW){
    $j(function(){
        var hi_client = {draw: function(ctx,dims){
            var corner_radius = 3;
            if(dims[0] >= corner_radius*2 && dims[1] >= corner_radius*2){
                ctx.globalAlpha = 1;
                ctx.strokeStyle = "#000000";
                ctx.fillStyle = "#ffffff";
                ctx.lineWidth = 1;
                //console.log(dims[0]+":"+dims[1]);
                BASE.roundRect(ctx,0.5,0.5,dims[0]-0.5,dims[1]-0.5,3);
                ctx.stroke();
            }
        }};
        test_fow = new FOW.create([{id: 'root',pos: ["5%","5%"],dims: ["40%","40%"], client: hi_client}],'canvasOne');//create new FullOfWindows
        //fill up this fow
    });
});

