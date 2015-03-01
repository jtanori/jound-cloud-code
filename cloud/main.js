var Image = require('parse-image');
  
var Mandrill = require('mandrill');
Mandrill.initialize('mxhWmtMyRCF56l7Ax6ksSA');
  
Parse.Cloud.afterSave('File', function(request, response){
    var f = request.object;
    if(!f.get('image')){
        response.error('File must have an image object.');
        return;
    }
    //Create recipient image
    var cropped = new Image();
  
    //Looks very messy but it is just a long data buffer
    Parse.Cloud.httpRequest({
        url: f.get('image').url()
    }).then(function(response){
        return cropped.setData(response.buffer);
    }).then(function(image){
        console.log("Image is " + image.width() + "x" + image.height() + ".");
        var w = image.width();
        var h = image.height();
        var defaults = {width: 500, height: 500};
  
        if(w >= 500 && h <= 500){
            return image.crop({width: h, height: h});
        }else if( h>= 500 && w <= 500){
            return image.crop({width: w, height: w});
        }else if(w > 500 && h > 500){
            return image.crop(defaults);
        }else{
            return image;
        }
    }).then(function(image){
        console.log("Image is cropped " + image.width() + "x" + image.height() + ".");
        //Save croped file
        return image.data();
    }).then(function(buffer){
        return (new Parse.File('cropped.jpg', {base64: buffer.toString('base64')})).save();
    }).then(function(c){
        f.set('cropped', c);
  
        return f.save();
    }).then(function(){
        return cropped;
    }).then(function(image){
        return image.scale({ width: 100, height: 100 });
    }).then(function(image){
        return image.data();
    }).then(function(buffer){
        return (new Parse.File('thumbnail.jpg', {base64: buffer.toString('base64')})).save();
    }).then(function(resized){
        f.set('thumbnail', resized);
  
        return f.save();
    }).then(function(){
        console.log('Thumbnail added to the File record.');
        response.success();
    }, function(error){
        console.log('Error creating thumbnail.');
        response.error(error);
    });
});
  
Parse.Cloud.afterSave('_User', function(request){
    if (request.object.existed()) {
        return;
    }
  
    var user = request.object;
    var email = user.get('email');
  
    if(!email){
        console.log(request);
        console.log("El correo no existe");
    }else{
        Mandrill.sendTemplate({
            message: {
                subject: "Bienvenido a Jound",
                from_email: 'no-reply@jound.mx',
                from_name: 'Jaime Tanori',
                to: [
                    {
                        email: email
                    }
                ]
            },
            template_name: 'joundwelcome',
            template_content: [
                {
                    "name": user.get('username')
                }
            ],
            async: true
        },{
            success: function(httpResponse) {
                console.log(httpResponse);
                console.log("Mensaje Enviado");
            },
            error: function(httpResponse) {
                console.error(httpResponse);
                console.error("No hemos podido enviar su mensaje, por favor intente de nuevo.");
            }
        });
    }
});

Parse.Cloud.afterSave('Message', function(request){
    if (request.object.existed()) {
        return;
    }
  
    var message = request.object;
    var user = message.get('visitor');
    var venue = message.get('venue');

    if(!user){
        console.log(request);
        console.log("El remitente no existe");
    }else{
        user
        	.fetch()
        	.then(function(){
        		var name = user.get('name');
        		var phone = user.get('phone');
        		var email = user.get('email');
        		var canBeContacted = user.get('canBeContacted');

        		Mandrill.sendTemplate({
		            message: {
		                subject: "Tiene un nuevo mensaje en Jound",
		                from_email: 'no-reply@jound.mx',
		                from_name: 'Jound Mensajes',
		                to: [
		                    {
		                        email: email,
		                        name: venue.get('name')
		                    }
		                ]
		            },
		            template_name: 'joundmessage',
		            template_content: [
		                {
		                    name: name,
		                    phone: phone,
		                    email: email,
		                    canBeContacted: canBeContacted
		                }
		            ],
		            async: true
		        },{
		            success: function(httpResponse) {
		                console.log(httpResponse);
		                console.log("Mensaje Enviado a: " + venue.get('name') + ':' + venue.id);
		            },
		            error: function(httpResponse) {
		                console.error(httpResponse);
		                console.error("No hemos podido enviar su mensaje, por favor intente de nuevo.");
		            }
		        });
        	})
        	.fail(function(e){
        		console.log('Ha ocurrido un error al enviar el mesaje');
        		console.log(user);
        		console.log(e);
        		console.log('----------------------------------------')
        	});
    }
});