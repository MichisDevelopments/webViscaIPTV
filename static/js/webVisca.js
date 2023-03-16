// touch or click detection. If mobile device than touch otherwise click
var mobileDevice   = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent);
var captureTouch = mobileDevice ? "touchstart" : "mousedown";

// all things that have to be done after loading the page
$(document).ready(function() {
    // active cam for VISCA commands

    // status of flags we need to prevent extensive request for move and zoom
    flg_moveInAction = false;
    flg_zoomInAction = false;
    flg_MoveDone=true;

    // default move action is 'C' for Center position of virtual joystick
    oldresult='C';

    // flag for waiting for a finished AJAX request
    BLOCKAJAX=false

    // bind "add camera" action to button
    $("#executeAddCamera").click(function(){
        addCamera();
    });

    // bind "delete camera" action to button
	$("#executeDeleteCamera").click(function(){
	    $.ajax({
            type: "GET",
            url: "/camera/delCamera",
            cache:false,
            data: {
                'camera': $("#delCameraId").val()
            },
            success: function(response){
                getCameras();
            },
            error: function(){
                alert("Error");
            }
        });
	});

    $("#execPreset").click(function(){
        executePreset(
            camera=$("#cameraId").val(),
            preset=$("#execPresetId").val()
            );
    });

    $("#execEdtPreset").click(function(){
        executeEditPreset();
    });

    // bind "add preset" action to button
    $("#executeAddPreset").click(function(){
        addPresets();
    });


    // bind "delete preset" action to button
	$("#executeDeletePreset").click(function(){
	    $.ajax({
            type: "GET",
            url: "/camera/delPreset",
            cache:false,
            data: {
                'preset': $("#delPresetId").val()
            },
            success: function(response){
                getPresets();
            },
            error: function(){
                alert("Error");
            }
        });
	});

	$("#executeEditPreset").click(function(){
        $.ajax({
            type: "GET",
            url: "/camera/execEdtPreset",
            cache:false,
            data: {
                'prepreset': $('#prePreset').val(),
                'camera': $('#camera').val()
            },
            success: function(response){
                getPresets();
            },
            error: function(){
                alert("Error");
            }
        });
    });

    // get all presets for current camera
    getPresets();
    getCameras();

    // if windows resize read presets and arrange it
    $( window ).resize(function() {
        getPresets();
        getCameras();
    });

    // create virtual joystick
    var manager = nipplejs.create({
        zone: document.getElementById('movectrl'),
        color: '#003366',
        size:200,
        threshold : 0.2,
        shape: 'square'
    });

    // what has to be done while joystick is moving around
    manager.on('move', function(evt,data){
        if (data.direction !== undefined) {

            // calculate direction depending on the relative position of the joystick based on the center
            var directionHorizontalLimitPos = 0.25
            var directionHorizontalLimitNeg = directionHorizontalLimitPos * -1;
            var directionVerticalLimitPos = 0.25;
            var directionVerticalLimitNeg = directionVerticalLimitPos * -1;

            result='C';

            posx = Math.cos(data.angle.radian);
            posy = Math.sin(data.angle.radian);

             if(posy >= directionVerticalLimitNeg && posx <= directionVerticalLimitPos) {
                    result = "C";
             }

             if(posy < directionVerticalLimitNeg)
                {
                    result = "S";
                }

             if(posy > directionVerticalLimitPos)
                {
                    result = "N";
                }


            if(posx < directionHorizontalLimitNeg)
            {
                if(result === "C")
                {
                    result = "W";
                }
                else
                {
                    result += "W";
                }
            }

            if(posx > directionHorizontalLimitPos)
            {
                if(result === "C")
                {
                    result = "E";
                }
                else
                {
                    result += "E";
                }
            }

            // while this function is always triggered we check if there is a change of direction. If not, ignore it.
            if ( result != oldresult) {

                oldresult = result;
                // send move command to server
                moveControl(
                    camera = $('#camera').val(),
                    direction = result,
                    speedp = $('#panspeed').val(),
                    speedt = $('#tiltspeed').val()
                )
            }
        }
    })

    // what has to be done while joystick is STOPPING moving around
    manager.on('end',function(){
        oldresult = '';
        // send move command to server
        moveControl(
            camera = $('#camera').val(),
            direction = 'C',
            speedp = 0,
            speedt = 0
        )
    });

/*
    // prepare the list of configured cameras
    $.ajax({
        type:'GET',
        url: '/camera/getCameras',
        success: function(response) {
            $('#camera').empty();
            for (i in response) {
                $('#camera').append("<option value='"+i+"'>"+response[i]+"</option>")
            }
            // check connection of first camera
            checkConnection( $('#camera').val() );
        }
    });
*/
    // bind "check connection" action to status field
    $('#connectstatus').click(function(){
        checkConnection( $('#camera').val() );
    })

    // on change of camera selection automatically check connection state
    $('#camera').change(function(){
        $('#connectstatus').removeClass('btn-danger btn-success').addClass('btn-secondary');
        $('#connectstatus').empty().append('Status');
        checkConnection($('#camera').val());
        getPresets();
    })

    // prepare dialog "Add New Preset"
    $( "#addNewPreset" ).dialog({
        autoOpen: false,
    });

    // prepare action to open dialog "Add New Preset"
    $( "#storeit" ).on( "click", function() {
        $("#addNewPreset" ).dialog( "open" );
    });

    /* seems to be obsolete
    // read version of camera
    $("#readVersion").click(function() {
       $.getJSON($SCRIPT_ROOT + '/camera/getVersion?camera=' + $('#camera').val(),
       function(data) {
           console.log(data);
       });
       return false;
    });

    // Camera Pan/Tilt
    $("#NW, #N, #NE, #E, #W, #SW, #S, #SE").bind(captureTouch,function(e) {
        var direction = $(this).attr('id');
        $('#statustext').removeClass('OK').removeClass('ERROR').text('');
        flg_moveInAction=true;
        moveControl(
            camera = $('#camera').val(),
            direction = direction,
            speedp = $('#panspeed').val(),
            speedt = $('#tiltspeed').val()
        );

    }).bind('touchend mouseup mouseleave',function() {
           if (flg_moveInAction) {
                moveControl(
                    camera = $('#camera').val(),
                    direction = 'STOP',
                    speedp = 0,
                    speedt = 0
                );
                flg_moveInAction = false;
           }
    });
    // camera STOP
    $("#CN").click(function(){
        var direction = $(this).attr('id');
        moveControl(
            camera = $('#camera').val(),
            direction = direction,
            speed = 20
        );
    });

    // submit manually a full VISCA command
    $("#submitcommand").click(function(){
        $.ajax({
            type:'GET',
            data: {
                command:$('#command').val()
            },
            url: '/camera/commitCommand',
            success: function(response) {
                $('#result').val(response['result'])
            }
        });
    });
    */

    // bind zoom in and zoom out to the corresponding buttons
    $("#TELE, #WIDE").bind(captureTouch,function(e) {
        var direction = $(this).attr('id');
        $('#statustext').removeClass('OK').removeClass('ERROR').text('');
        flg_zoomInAction = true;
        zoomControl(
            camera = $('#camera').val(),
            direction = direction,
            speedz = $('#zoomspeed').val()
        );
    }).bind('touchend mouseup mouseleave',function() {
        if (flg_zoomInAction) {
            zoomControl(
                camera = $('#camera').val(),
                direction = 'STOP',
                speedz = 0
            );
            flg_zoomInAction = false;
        }
    });




});


// set design of active cam
function handleActiveCams(cam) {
    for (i=1; i<8; i++) {
        if (i != cam) {
            $("#cam" + i).removeClass('wv_active');
        } else {
            $("#cam" + i).addClass('wv_active');
        }
    }
}

// camera moving
function moveControl(camera, direction, speedp=0, speedt=0, callback){
       return $.ajax({
            type:'GET',
            data: {
                camera: camera,
                direction: direction,
                speedp: speedp,
                speedt: speedt
            },
            url: '/camera/moveControl',
            success: function(response) {
                result = response;

                flg_MoveDone=true;
            }
        });
}

function getPresets(){
    $.ajax({
        type:'GET',
        url: '/camera/getPresets',
        data: {
                camera: $('#camera').val()
            },
        success: function(response) {
            $('#presetlist').empty();
            $('#prePreset').empty().append("<option value=''></option>");

            maxcol = Math.floor($( window ).width()/400);
            colwidth = 100 / (maxcol);

            amount = Object.keys(response).length;

            fullrows = Math.floor(amount/maxcol);
            lastcols = amount % maxcol;

            if (lastcols > 0) {
                fullrows += 1;
            }


            // create button section
            presetHeader=`
            <div class="">
                <table class="table table-striped">
                    <tbody>
                        <tr>
            `;

            presetFooter=`
                        </tr>
                    </tbody>
                </table>
            </div>
            `;

            presetContent='';

            rowcount = 0;
            columncount = 0;

            for (i in response) {
                insertline = "<div class='btn-group' style='width:100%;'><button id='preset_"+i+"' class='btn btn-outline-primary  btn-lg btn-block' type='button' value='"+i+"'>"+response[i]+"</button>" +
                "<button id='presete_"+i+"' class='btn btn-outline-success bi bi-pencil' type='button' value='"+i+"'></button>" +
                "<button id='presetd_"+i+"' class='btn btn-outline-danger bi bi-eraser' type='button' value='"+i+"'></button></div>";

//data-toggle='modal' data-target='#deletePreset'

                if (columncount < maxcol) {
                    presetContent += "<td style='width:" + colwidth + "%;'>" + insertline + "</td>";
                    columncount += 1
                } else {
                    columncount = 0;
                    rowcount += 1;
                    if (rowcount < fullrows) {
                        presetContent += "</tr><tr><td style='width:" + colwidth + "%'>" + insertline + "</td>";
                        columncount += 1;
                    }
                }

                $('#prePreset').append("<option value='"+i+"'>"+response[i]+"</option>");

                /* obsolete
                $('#preset_'+i).click(function(){
                    execPreset($('#camera').val(), $(this).val() )
                });
                */
            }

            missingRows = maxcol - columncount;

            for (i=0; i < missingRows ; i++){
                presetContent += "<td style='width:" + colwidth + "%'></td>";
            }

            $('#presetlist').append(presetHeader + presetContent + presetFooter);

            for (i in response) {
                // bind actions to the preset buttons
                $('#preset_'+i).click(function(){
                    //execPreset($('#camera').val(), $(this).val() )
                    executePreset($('#camera').val(), $(this).val() )
                });
                $('#presete_'+i).click(function(){
                    editPreset($(this).val() )
                });
                $('#presetd_'+i).click(function(){
                    deletePreset($(this).val() )
                });
            }
        }
    });
}


function getCameras(){
    $.ajax({
        type:'GET',
        url: '/camera/getCameras',
        data: {
                camera: $('#camera').val()
            },
        success: function(response) {

            $('#camera').empty();
            for (i in response) {
                $('#camera').append("<option value='"+i+"'>"+response[i]+"</option>")
            }
            // check connection of first camera
            checkConnection( $('#camera').val() );

            $('#cameralist').empty();

            maxcol = Math.floor($( window ).width()/400);
            colwidth = 100 / (maxcol);

            amount = Object.keys(response).length;

            fullrows = Math.floor(amount/maxcol);
            lastcols = amount % maxcol;

            if (lastcols > 0) {
                fullrows += 1;
            }


            // create button section
            presetHeader=`
            <div class="">
                <table class="table table-striped">
                    <tbody>
                        <tr>
            `;

            presetFooter=`
                        </tr>
                    </tbody>
                </table>
            </div>
            `;

            presetContent='';

            rowcount = 0;
            columncount = 0;

            for (i in response) {
                insertline = "<div class='btn-group' style='width:100%;'><button id='camera_"+i+"' class='btn btn-outline-primary  btn-lg btn-block' type='button' value='"+i+"'>"+response[i]+"</button>" +
                    "<button id='camerad_"+i+"' class='btn btn-outline-danger bi bi-eraser' type='button' value='"+i+"'></button></div>";

//data-toggle='modal' data-target='#deletePreset'

                if (columncount < maxcol) {
                    presetContent += "<td style='width:" + colwidth + "%;'>" + insertline + "</td>";
                    columncount += 1
                } else {
                    columncount = 0;
                    rowcount += 1;
                    if (rowcount < fullrows) {
                        presetContent += "</tr><tr><td style='width:" + colwidth + "%'>" + insertline + "</td>";
                        columncount += 1;
                    }
                }
            }

            missingRows = maxcol - columncount;

            for (i=0; i < missingRows ; i++){
                presetContent += "<td style='width:" + colwidth + "%'></td>";
            }

            $('#cameralist').append(presetHeader + presetContent + presetFooter);

            for (i in response) {
                $('#camerad_'+i).click(function(){
                    deleteCamera($(this).val() )
                });
            }
        }
    });
}


function zoomControl(camera, direction, speedz){
    $.ajax({
        type:'GET',
        data: {
            camera: camera,
            direction: direction,
            speedz: speedz
        },
        url: '/camera/zoomControl',
        success: function(response) {
            if (response['status'] == "OK") {
                $('#statustext').addClass('OK').removeClass('ERROR').text('OK');
            }
            if (response['status'] == "ERROR") {
                $('#statustext').addClass('ERROR').removeClass('OK').text(response['response'])
            }

        }
    });
}

function inquiryPosition(camera){
    $.ajax({
        type:'GET',
        data: {
            camera: camera
        },
        url: '/camera/inquiryPosition',
        success: function(response) {
            if (response['status'] == "OK") {
                $('#statustext').addClass('OK').removeClass('ERROR').text('OK');
            }
            if (response['status'] == "ERROR") {
                $('#statustext').addClass('ERROR').removeClass('OK').text(response['response'])
            }

        }
    });
}

function inquiryZoom(camera) {
    $.ajax({
        type: 'GET',
        url : '/camera/inquiryZoom',
        data: {
            camera: camera
        },
        success: function(response) {
            console.log('getAjax response', response);

        },
        error: function(response) {
            console.log('error getAjax response', response);

        },
     });
}

function checkConnection(camera) {
    $.ajax({
        type: 'GET',
        url : '/camera/checkConnection',
        data: {
            camera: camera
        },
        success: function(response) {
            if (response['status'] == "DISCONNECTED") {
                $('#connectstatus').removeClass('btn-secondary btn-success').addClass('btn-danger');
                $('#connectstatus').empty().append('nicht verbunden');
                $('#maincontrol').hide();
            }

            if (response['status'] == "CONNECTED") {
                $('#connectstatus').removeClass('btn-secondary btn-danger').addClass('btn-success');
                $('#connectstatus').empty().append('verbunden');
                $('#maincontrol').show();
            }
        },
        error: function(response) {
            console.log('error getAjax response', response);
        },
     });
}


function execPreset(camera, preset) {
    var modal = $('#executePreset');
    modal.modal({backdrop: 'static'});
    modal.find('.modal-footer').show();
    modal.find('.modal-body').html('Wirklich die Position <b>'+ $("#preset_"+preset).text() +'</b> ansteuern?' +
    '<input type="hidden" id="execPresetId" value="' + preset + '">' +
    '<input type="hidden" id="cameraId" value="' + camera + '">');
    modal.modal('show');
}

function executePreset(camera, preset){
    /*
    var modal = $('#executePreset');
    modal.find('.modal-body').html('Die Position <b>'+ $("#preset_"+preset).text() +'</b> wird angefahren!<br> <br> <b>Bitte warten ...</b>');
    modal.find('.modal-footer').hide();
    modal.modal('show');
    */

    $.ajax({
        type:'GET',
        data: {
            camera: camera,
            preset: preset
        },
        url: '/camera/executePreset',
        success: function(response) {
            console.log(response);
            modal.modal('hide');

        }
    });
}


function deletePreset(preset) {
    var modal = $('#deletePreset');
    modal.modal({backdrop: 'static'});
    modal.find('.modal-body').html('Wirklich die Position <b>'+ $("#preset_"+preset).text() +'</b> löschen?' +
    '<input type="hidden" id="delPresetId" value="' + $("#preset_"+preset).val() + '">');
    modal.modal('show');
}


function editPreset(preset) {
    $("#edtPSpeed option").attr('selected', null);
    $("#edtTSpeed option").attr('selected', null);

    var modal = $('#edtPreset');
    modal.modal({backdrop: 'static'});

    $.ajax({
		type: "GET",
		url: "/camera/edtPreset",
		cache:false,
		data: {
		    'preset':preset,
		},
		success: function(response){
		    console.log(response)
			$('#edtPresetName').val(response['NAME']);

            $("#edtPSpeed option[value=" + response['PANSPEED'] + "]").attr('selected', 'selected').focus();
            $("#edtTSpeed option[value=" + response['TILTSPEED'] + "]").attr('selected', 'selected').focus();

            if (response['SYNCZOOM']) {
                $('#edtsynczoom').prop( "checked", true );
            } else {
                $('#edtsynczoom').prop( "checked", false );
            }

            if (response['WIDEZOOM']) {
                $('#edtwidezoom').prop( "checked", true );
            } else {
                $('#edtwidezoom').prop( "checked", false );
            }
		},
		error: function(){
			alert("Error");
		}
	});
    modal.modal('show');

}

function executeEditPreset(){
     if ($("#edtsynczoom").prop("checked")){
        synczoom=1;
     } else {
        synczoom=0;
     }

     if ($("#edtwidezoom").prop("checked")){
        widezoom=1;
     } else {
        widezoom=0;
     }

     if ($("#changeptz").prop("checked")){
        changeptz=1;
     } else {
        changeptz=0;
     }

	 $.ajax({
		type: "GET",
		url: "/camera/addPreset",
		cache:false,
		data: {
		    'name': $('#edtPresetName').val(),
		    'speedp': $('#edtPSpeed').val(),
		    'speedt': $('#edtTSpeed').val(),
		    'synczoom': synczoom,
		    'widezoom': widezoom,
		    'prepreset': $('#edtprePreset').val(),
		    'camera': $('#camera').val(),
		    'changeptz': changeptz
		},
		success: function(response){
		    $('#edtPreset').hide();
			getPresets();
		},
		error: function(){
			alert("Error");
		}
	});
}

function addPresets(){
     if ($("#synczoom").prop("checked")){
        synczoom=1;
     } else {
        synczoom=0;
     }

     if ($("#widezoom").prop("checked")){
        widezoom=1;
     } else {
        widezoom=0;
     }

	 $.ajax({
		type: "GET",
		url: "/camera/addPreset",
		cache:false,
		data: {
		    'name': $('#PresetName').val(),
		    'speedp': $('#PSpeed').val(),
		    'speedt': $('#TSpeed').val(),
		    'synczoom': synczoom,
		    'widezoom': widezoom,
		    'prepreset': $('#prePreset').val(),
		    'camera': $('#camera').val()
		},
		success: function(response){
			getPresets();
		},
		error: function(){
			alert("Error");
		}
	});
}

function addCamera(){
     $.ajax({
		type: "GET",
		url: "/camera/addCamera",
		cache:false,
		data: {
		    'name': $('#CameraName').val(),
		    'cameraip': $('#CameraIP').val(),
		    'cameraport': $('#CameraPORT').val(),
		},
		success: function(response){
			getCameras();
		},
		error: function(){
			alert("Error");
		}
	});
}

function deleteCamera(preset) {
    var modal = $('#deleteCamera');
    modal.modal({backdrop: 'static'});
    modal.find('.modal-body').html('Wirklich die Kamera <b>'+ $("#camera_"+preset).text() +'</b> löschen?' +
    '<input type="hidden" id="delCameraId" value="' + $("#camera_"+preset).val() + '">');
    modal.modal('show');
}

