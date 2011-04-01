/*  Kata Javascript Graphics - XML3D Interface
 *  xml3dgfx.js
 *
 *  Copyright (c) 2010, Sergiy Byelozyorov
 *  All rights reserved.
 *
 *  Redistribution and use in source and binary forms, with or without
 *  modification, are permitted provided that the following conditions are
 *  met:
 *  * Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in
 *    the documentation and/or other materials provided with the
 *    distribution.
 *  * Neither the name of Sirikata nor the names of its contributors may
 *    be used to endorse or promote products derived from this software
 *    without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
 * IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
 * TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
 * PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER
 * OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */



Kata.require([
    'katajs/oh/GraphicsSimulation.js',
    ['externals/xml3d/xml3d.js', 'externals/xml3d/xml3d_animation.js']
], function() {
    
    /* XML3DGraphics class */
    
    var XML3DGraphics = function(callbackFunction, parentElement) {
        this.parentElement = parentElement;
        
        // create dictionary of objects
        this.objects = {};
        
        // load base world and set up scene root
        if (window.xml3dText == undefined)
            this.root = document.createElementNS(org.xml3d.xml3dNS, "xml3d");
        else
        {
            var parser = new DOMParser();
            var xml3dDoc = parser.parseFromString(window.xml3dText, "text/xml");
            this.root = document.importNode(xml3dDoc.documentElement, true);
        }
        
        this.root.style.width = "100%";
        this.root.style.height = "100%";
        parentElement.appendChild(this.root);
        
        // find or create defs element
        this.defs = this.root.getElementsByTagNameNS(org.xml3d.xml3dNS, "defs")[0];
        if (this.defs == undefined)
        {
            this.defs = document.createElementNS(org.xml3d.xml3dNS, "defs");
            this.root.insertChild(this.defs,  this.root.firstChild);
        }
        
        // bind message handlers
        var thus = this;
        
        // set mouse handlers for XML3D canvas
        $(this.root).bind("mousedown", function (e){thus.mouseDown(e)});
        $(this.root).bind("mouseup",   function (e){thus.mouseUp(e)});
        $(this.root).bind("mousemove", function (e){thus.mouseMove(e)});
        //$(this.root).bind("scroll",    function (e){thus.scrollWheel(e)});
        
        this.root.addEventListener('mousewheel', function(e) { thus.scrollWheel(e); }, true); // Chrome
        this.root.addEventListener('DOMMouseScroll', function(e) { thus.scrollWheel(e); }, true); // Firefox
        
        // set keyboard handlers for entire document
        $(document).bind("keydown",   function (e){thus.keyDown(e)});
        $(document).bind("keyup",     function (e){thus.keyUp(e)});
        
        // map for pressed keys
        this.keyDownMap = {};
        
        // perform regular updates
        this.scheduledUpdates = [];
        setInterval(Kata.bind(this.update, this), 16);
    };
    
    XML3DGraphics.initialize = function(scenefile, cb) {
        $.ajax({
            url: scenefile,
            success: function(data) {
               window.xml3dText = data;
               cb();
            },
            dataType: "text"
        });
    }
    
    // push an update into the queue and return it's index
    XML3DGraphics.prototype.scheduleUpdate = function(newUpdate) {
        return this.scheduledUpdates.push(newUpdate) - 1;
    };
    
    // remove an update from the queue by it's index
    XML3DGraphics.prototype.cancelUpdate = function(updateIndex) {
        delete this.scheduledUpdates[updateIndex];
    };
    
    // handle updates
    XML3DGraphics.prototype.update = function() {
        for (var index in this.scheduledUpdates)
        {
            // update may reschedule itself again by returning false
            // otherwise it is deleted from the list of update
            if (this.scheduledUpdates[index]())
                delete this.scheduledUpdates[index];
        }
    };

    // Messages from the KataJS
    
    XML3DGraphics.prototype.methodTable = {};
    
    XML3DGraphics.prototype.methodTable["create"] = function(msg) {
        console.log("create " + msg.id);
        
        this.objects[msg.id] = new XML3DVWObject(msg, this);
    };
    
    XML3DGraphics.prototype.methodTable["mesh"] = function(msg) {
        console.log("mesh " + msg.id);
        
        if (this.objects[msg.id] === undefined)
            console.error("Cannot add a mesh. Object " + msg.id + " does not exist.");
        else
            this.objects[msg.id].initMesh(
                msg.mesh,
                msg.type === undefined ? "xml3d" : msg.type
            );
    };
    
    XML3DGraphics.prototype.methodTable["move"] = function(msg) {
        /*var EPS = 0.001;
        
        if ((this.lastMoveMsg == undefined ||
            Math.abs(this.lastMoveMsg.pos[0] - msg.pos[0]) > EPS ||
            Math.abs(this.lastMoveMsg.pos[1] - msg.pos[1]) > EPS ||
            Math.abs(this.lastMoveMsg.pos[2] - msg.pos[2]) > EPS ||
            Math.abs(this.lastMoveMsg.orient[0] - msg.orient[0]) > EPS ||
            Math.abs(this.lastMoveMsg.orient[1] - msg.orient[1]) > EPS ||
            Math.abs(this.lastMoveMsg.orient[2] - msg.orient[2]) > EPS ||
            Math.abs(this.lastMoveMsg.orient[3] - msg.orient[3]) > EPS ||
            this.lastMoveMsg.id != msg.id) &&
            this.objects[msg.id].objType == "mesh")
        {
            console.debug("move " + msg.id);
            console.debug(msg);
            
            this.lastMoveMsg = msg;
        }*/
            
        
        if (this.objects[msg.id] === undefined)
            console.error("Cannot move an object " + msg.id + " .It does not exist.");
        else
            this.objects[msg.id].move(msg, msg.interpolate == undefined ? true : msg.interpolate);
    }
    
    XML3DGraphics.prototype.methodTable["animate"] = function(msg) {
        //console.log("animate " + msg.id + " " + msg.animation);
        
        if (this.objects[msg.id] === undefined)
            console.error("Cannot animate an object " + msg.id + ". It does not exist.");
        else
            this.objects[msg.id].animate(msg.animation);
    }
    
    XML3DGraphics.prototype.methodTable["camera"] = function(msg) {
        console.log("camera " + msg.id);
        
        if (this.objects[msg.id] === undefined)
            console.error("Cannot add a mesh. Object " + msg.id + " does not exist.");
        else
            this.objects[msg.id].initCamera();
    }
    
    XML3DGraphics.prototype.methodTable["attachcamera"] = function(msg) {
        console.log("attachcamera " + msg.id);
        
        if (this.objects[msg.id] === undefined)
            console.error("Cannot attach camera. Object " + msg.id + " does not exist.");
        else 
            this.objects[msg.id].attachCamera(msg);
    }
    
    XML3DGraphics.prototype.methodTable["destroy"] = function(msg) {
        console.log("destroy " + msg.id);
        
        if (this.objects[msg.id] === undefined)
            console.error("Cannot destroy  object " + msg.id + ". It does not exist.");
        else
        {
            this.objects[msg.id].destroy();
            delete this.objects[msg.id];
        }
    }
    
    XML3DGraphics.prototype.methodTable["disabled"] = function(msg) {
    	if (msg.type == "mousemove")
    		mouseMoveMessageEnabled.mouseMoveMessageEnabled = false;
    	else if (msg.type == "pick")
    		mouseMoveMessageEnabled.pickMessageEnabled = false;
    	else if (msg.type == "drag")
    		mouseMoveMessageEnabled.dragMessageEnabled = false;
    };
    
    XML3DGraphics.prototype.methodTable["enabled"] = function(msg) {
    	if (msg.type == "mousemove")
    		mouseMoveMessageEnabled.mouseMoveMessageEnabled = true;
    	else if (msg.type == "pick")
    		mouseMoveMessageEnabled.pickMessageEnabled = true;
    	else if (msg.type == "drag")
    		mouseMoveMessageEnabled.dragMessageEnabled = true;
    };
    
    XML3DGraphics.prototype.methodTable["unknown"] = function(msg) {
        console.log("unknown message: " + msg.msg);
        console.log(msg);
    };
    
    XML3DGraphics.prototype.send = function(obj) {
        obj.msg = obj.msg.toLowerCase();
        
        if (this.methodTable[obj.msg])
            this.methodTable[obj.msg].call(this, obj);
        else
            this.methodTable["unknown"].call(this, obj);
    };
    
    // Messages to KataJS
    
    XML3DGraphics.prototype.setInputCallback = function(cb) {
        this.inputCallback = cb;
    };
    
    XML3DGraphics.prototype.initMouseEventMessage = function(jQueryEvent, eventName) {
        var browserEvent = jQueryEvent.originalEvent;
    	
    	return {
        	msg: eventName,
        	x: browserEvent.clientX - $(this.root).offset().left,
        	y: browserEvent.clientY - $(this.root).offset().top,
        	clientX: browserEvent.clientX,
        	clientY: browserEvent.clientY,
        	shiftKey: browserEvent.shiftKey,
        	ctrlKey: browserEvent.ctrlKey,
        	altKey: browserEvent.altKey,
        	event: browserEvent,
        	// TODO: what to fill in here?
        	spaceid: null,
        	camerapos: null,
        	dir: null
        };
    };
    
    XML3DGraphics.prototype.mouseDown = function(e) {
    	var msg = this.initMouseEventMessage(e, "mousedown");
    	msg.button = e.button;
        this.inputCallback(msg);
        
        this.lastMouseDownPosition = {x: e.clientX, y: e.clientY};
        
        if (this.pickMessageEnabled)
        {
        	msg.msg = "pick";
        	msg.id = null; // TODO: fill in object id (search parent group that holds an object and if reached root return null)
        	msg.pos = [e.originalEvent.position.x, e.originalEvent.position.y, e.originalEvent.position.z];
        	msg.normal = [e.originalEvent.normal.x, e.originalEvent.normal.y, e.originalEvent.normal.z];
        }
    };
    
    XML3DGraphics.prototype.mouseUp = function(e) {
    	var msg = this.initMouseEventMessage(e, "mouseup");
    	msg.button = e.which;
        this.inputCallback(msg);
        
        if (this.lastMouseDownPosition)
        {
        	var dx = Math.abs(this.lastMouseDownPosition.x - msg.clientX);
        	var dy = Math.abs(this.lastMouseDownPosition.y - msg.clientY);
        	
        	if (dx < 2 && dy < 2)
        	{
        		// convert "mouseup" message to "click"
        		msg.msg = "click";
        		this.inputCallback(msg);
        	}
        	else
        	{
        		// convert "mouseup" message to "drop"
        		msg.msg = "drop";
        		msg.dx = dx;
        		msg.dy = dy;
        		
        		this.inputCallback(msg);
        	}
        }
    };
    
    XML3DGraphics.prototype.mouseMove = function(e) {
    	if (this.mouseMoveMessageEnabled)
    	{
    		var msg = this.initMouseEventMessage(e, "mousemove");
    		this.inputCallback(msg);
    	}
    	
    	if (this.dragMessageEnabled && this.lastMouseDownPosition)
    	{
    		var msg = this.initMouseEventMessage(e, "drag");
    		msg.dx = Math.abs(this.lastMouseDownPosition.x - msg.clientX);
        	msg.dy = Math.abs(this.lastMouseDownPosition.y - msg.clientY);
    		this.inputCallback(msg);
    	}
    };

    XML3DGraphics.prototype.keyDown = function(e) {
        var repeat = false;
    	if (this.keyDownMap[e.keyCode] !== true)
        	this.keyDownMap[e.keyCode] = true;
    	else
    		repeat = true;
        
    	var msg = {
			msg: "keydown",
			altKey: e.altKey,
			metaKey: e.metaKey,
			ctrlKey: e.ctrlKey,
			shiftKey: e.shiftKey,
			repeat: repeat,
			keyCode: e.keyCode
    	};
    	
    	this.inputCallback(msg);
    };

    XML3DGraphics.prototype.keyUp = function(e) {
    	this.keyDownMap[e.keyCode] = false;
    	
    	var msg = {
			msg: "keyup",
			altKey: e.altKey,
			metaKey: e.metaKey,
			ctrlKey: e.ctrlKey,
			shiftKey: e.shiftKey,
			keyCode: e.keyCode
    	};
    	
    	this.inputCallback(msg);
    };

    XML3DGraphics.prototype.scrollWheel = function(e) {
        var msg = {
    		msg: "wheel",
    		event: e,
    		shiftKey: e.shiftKey,
        	ctrlKey: e.ctrlKey,
        	altKey: e.altKey
        };
        
        if (e.wheelDeltaX || e.wheelDeltaY) {         // Chrome
            msg.dy = e.wheelDeltaY || 0;
            msg.dx = -e.wheelDeltaX || 0;
        } else if (e.wheelDelta) {
            msg.dy = e.wheelDelta;
            msg.dx = 0;
        } else if (e.detail) {                        // Firefox
            if (e.axis == 1) {
                msg.dx = e.detail * 40;               // -3 for Firefox == 120 for Chrome
                msg.dy = 0;
            } else {
                msg.dy = e.detail * -40;
                msg.dx = 0;
            }
        }
    	
    	this.inputCallback(msg);
    };
    
    /* XML3DVMObject class */
	
	function XML3DVWObject(msg, gfx) {
		this.id = msg.id;
		this.spaceID = msg.spaceID;
		this.gfx = gfx;
		
		this.curLocation = Kata.LocationSet(msg);	
	}
	
	XML3DVWObject.prototype.initMesh = function(mesh, type) {
		if (this.objType === undefined)
		{
			if (type == "xml3d")
			{
				this.objType = "mesh";
				this.mesh = mesh;
				var thus = this;
				
				// load mesh asynchronously
				$.ajax({
					url: mesh,
					success: function(data) {
						// parse received mesh
						var doc = new DOMParser().parseFromString(data, "text/xml");
						
						// notify gfx that we have loaded the mesh
						thus.gfx.inputCallback({msg: "loaded", id: thus.id});
						
						// append new object to the scene
						if (doc && doc.documentElement.nodeName.toLowerCase() == "xml3d")
						{
							// create transformation
							thus.transformID = "transform" + thus.id;
							thus.transform = document.createElementNS(org.xml3d.xml3dNS, "transform");
							thus.transform.setAttribute("id", thus.transformID);
							thus.gfx.defs.appendChild(thus.transform);
							
							// add suffix to id's in the mesh document
							thus.appendSuffixToIds(doc.documentElement, thus.id);
							
							// function to update location of the mesh
							thus.updateLocation = function(interpolate) {
								var location = Kata.LocationExtrapolate(this.curLocation, new Date().getTime());
								
								this.transform.translation = new XML3DVec3(location.pos[0], location.pos[1], location.pos[2]);
								this.transform.rotation.setQuaternion(new XML3DVec3(location.orient[0], location.orient[1], location.orient[2]), location.orient[3]);
								
								this.gfx.root.update();
								
								return !interpolate;
							}
							
							// place new mesh at the last received location
							thus.updateLocation(false);
							
							// create group
							thus.group = document.createElementNS(org.xml3d.xml3dNS, "group");
							thus.group.setAttribute("id", thus.id);
							thus.group.transform = "#" + thus.transformID;
							// TODO: set shader when support will be added to JavascriptGraphicsAPI
							thus.gfx.root.appendChild(thus.group);
							
							// add mesh to the group
							for (var n = doc.documentElement.firstChild; n; n = n.nextSibling)
								thus.group.appendChild(document.importNode(n, true));
							
							// configure animations for the new mesh
							var animationsNode = document.getElementById("animations" + thus.id);
							if (animationsNode) {
								// create an array with animations
								thus.animations = {};
								
								// parse embedded animations and fill created array
								for (var childIndex in animationsNode.childNodes) {
									var animElem = animationsNode.childNodes[childIndex];
									
									if (animElem.nodeType == Node.ELEMENT_NODE && animElem.nodeName.toLowerCase() == "group" && animElem.hasAttribute("id")) {
										var elementId = animElem.getAttribute("id");
										var animName = elementId.substring(0, elementId.length - thus.id.length);
										
										thus.animations[animName] = [];
										
										for (var mapIndex in animElem.childNodes) {
											var mapElem = animElem.childNodes[mapIndex];
											
											if (mapElem.nodeType == Node.ELEMENT_NODE && mapElem.nodeName.toLowerCase() == "map" && mapElem.hasAttribute("source") && 
													mapElem.hasAttribute("target") && mapElem.hasAttribute("field")) {
												thus.animations[animName].push({
													"source": mapElem.getAttribute("source"),
													"target": mapElem.getAttribute("target"),
													"field": mapElem.getAttribute("field")
												});
											}
										}
									}
								}
								
								// update list of interpolators for XML3D animation manager
								org.xml3d.animation.animationManager.updateInterpolators();
								
								// create storage for running animations
								thus.runningAnimations = [];
								
								// run last saved animation
								if (thus.savedAnimation != undefined) {
									thus.animate(thus.savedAnimation);
									delete thus.savedAnimation;
								}
							}
						}
					},
					error: function() {
						console.error("Failed to load mesh for object " + thus.id);
					},
					dataType: "text"
				});
			}
			else
				console.error("Cannot add a mesh. Type " + type + " is not supported.");
		}
		else
			console.error("Cannot set object " + msg.id + " as mesh. " +
				"It is already a " + this.objType + ".");
	}
	
	XML3DVWObject.prototype.initCamera = function() {
		if (this.objType === undefined)
		{
			this.objType = "camera";
			
			// create view element and set an id
			this.viewID = "view" + this.id;
			this.view = document.createElementNS(org.xml3d.xml3dNS, "view");
			this.view.setAttribute("id", this.viewID);
			
			// function to update location of the camera
			this.updateLocation = function(interpolate) {
				var location = Kata.LocationExtrapolate(this.curLocation, new Date().getTime());
				
				this.view.position = new XML3DVec3(location.pos[0], location.pos[1], location.pos[2]);
				this.view.orientation.setQuaternion(new XML3DVec3(location.orient[0], location.orient[1], location.orient[2]), location.orient[3]);
				
				this.gfx.root.update();
				
				return !interpolate;
			}
			
			// place new camera at the last received location
			this.updateLocation(false);
			
			this.gfx.root.appendChild(this.view);
		}
		else
			console.error("Cannot set object " + msg.id + " as camera. " +
				"It is already a " + this.objType + ".");
	}
	
	// attach camera to the selected view
	XML3DVWObject.prototype.attachCamera = function(msg) {
		if (this.objType != "camera")
			console.error("Cannot attach camera. Object " + this.id + " is " + this.objType + ".");
		else if (msg.target == undefined)
			console.error("Attaching camera to an object texture is not supported.");
		else if (msg.target != 0)
			console.error("Camera can only be attached to the framebuffer. Stereo is not supported.");
		else
			this.gfx.root.activeView = "#" + this.viewID;
	}
	
	// move object to a new location (derived from message)
	XML3DVWObject.prototype.move = function(msg, interpolate) {
		// set message time if not set (required to be set by Kata.LocationUpdate)
		if (!msg.time)
			msg.time = new Date().getTime();
		
		// create proper location update from the message (fill in missing fields)
		var newLocation = Kata.LocationUpdate(msg, this.curLocation, this.prevLocation, msg.time || new Date().getTime())
		
		// save new location
		this.prevLocation = this.curLocation;
		this.curLocation = newLocation;
		
		// schedule an update
		if (this.updateLocation)
		{
			if (this.lastScheduledUpdateIndex !== undefined)
				this.gfx.cancelUpdate(this.lastScheduledUpdateIndex);
			this.lastScheduledUpdateIndex = this.gfx.scheduleUpdate(Kata.bind(this.updateLocation, this, interpolate));
		}
	}
	
	// start named animation of an object
	XML3DVWObject.prototype.animate = function(animationName) {
		if (this.objType != "mesh") {
			console.error("Cannot animate an object " + this.id + ". It is not a mesh.");
			return;
		}
		
		// save animation if we haven't loaded mesh yet
		if (this.animations == undefined) {
			this.savedAnimation = animationName;
		} else if (this.animations[animationName] == undefined) {
			console.error("Cannot animate an object " + this.id + ". Animation '" + animationName + "' does not exist.");
			return;
		} else {
			// stop previous animation
			if (this.runningAnimations != undefined) {
				for (var i in this.runningAnimations)
					org.xml3d.stopAnimation(this.runningAnimations[i]);
				
				// reinitalize array to free memory
				this.runningAnimations = [];
			}
			
			for (var i in this.animations[animationName]) {
				var animRec = this.animations[animationName][i];
				this.runningAnimations.push(org.xml3d.startAnimation(animRec.source, animRec.target, animRec.field, 1000, true));
			}	
		}
	}
	
	XML3DVWObject.prototype.destroy = function() {
		if (this.objType == "mesh") {
			// stop animations if they are running
			if (this.runningAnimations != undefined)
				for (var i in this.runningAnimations)
					org.xml3d.stopAnimation(this.runningAnimations[i]);
			
			// cancel last update if scheduled
			if (this.lastScheduledUpdateIndex != undefined)
				this.gfx.cancelUpdate(this.lastScheduledUpdateIndex);
			
			// remove avatar from the scene
			this.group.parentNode.removeChild(this.group);
			this.transform.parentNode.removeChild(this.transform);
		} else if (this.objType == "camera") {
			// detach camera if attached
			if (this.gfx.root.activeView == "#" + this.viewID)
				this.gfx.root.activeView = "";
			
			// remove view from the scene
			this.view.parentNode.removeChild(this.view);
		}
	}
	
	// rename all ids in the element and all of it's children 
	// by adding suffix to the end of the id
	XML3DVWObject.prototype.appendSuffixToIds = function(element, suffix) {
		// reference attribute database
		var refAttrDB = {
			"": ["id"], // for all elements
			"group": ["transform", "shader"],
			"mesh": ["src"],
			"light": ["shader"],
			"xml3d": ["activeView"],
			"map": ["source", "target"],
			"data": ["src"]
		};
		
		// refernce css property database
		var refCSSPropDB = {
			"group": ["transform", "shader"]			
		};
		
		// function to rename reference attributes
		function fixAttrs(element, suffix, attrs) {
			for (var i in attrs)
				if (element.hasAttribute(attrs[i]))
					element.setAttribute(attrs[i], element.getAttribute(attrs[i]) + suffix);
		}
		
		// rename reference attributes common for all elements
		fixAttrs(element, suffix, refAttrDB[""]);
		
		// rename reference attributes specific to this element
		if (refAttrDB[element.nodeName.toLowerCase()] !== undefined)
			fixAttrs(element, suffix, refAttrDB[element.nodeName.toLowerCase()]);
		
		// function to rename reference CSS properties
		function fixCSSProps(element, suffix, attrs) {
			for (var i in attrs)
			{
				var value = element.style[attrs[i]];
				if (value !== undefined && value.substring(0, 4) == "url(")
					 element.style[attrs[i]] = "url(" + value.substring(4, value.length - 1) + suffix + ")";
			}
		}
		
		// rename reference CSS properties specific to this element
		if (refCSSPropDB[element.nodeName.toLowerCase()] !== undefined)
			fixCSSProps(element, suffix, refCSSPropDB[element.nodeName.toLowerCase()]);
		
		// special handling for "script" attribute, since it may contain URN reference
		// which must remain unchanged
		if (element.nodeName.toLowerCase() == "lightshader" || element.nodeName.toLowerCase() == "shader")
			if (element.hasAttribute("script") && element.getAttribute("script").substring(0, 3) != "urn")
				fixAttrs(element, suffix, ["script"]);
		
		// process child elements recursively
		for (var childIndex in element.childNodes)
			if (element.childNodes[childIndex].nodeType == Node.ELEMENT_NODE)
				this.appendSuffixToIds(element.childNodes[childIndex], suffix);
	}

    // Register XML3D as available graphics driver
    Kata.GraphicsSimulation.registerDriver("XML3D", XML3DGraphics);
}, "katajs/gfx/xml3dgfx.js");
