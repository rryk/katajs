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
				thus = this;
				
				// load mesh asynchronously
				$.ajax({
					url: mesh,
					success: function(data) {
						// parse received mesh
						var doc = new DOMParser().parseFromString(data, "text/xml");
						
						// append new object to the scene
						if (doc && doc.documentElement.nodeName.toLowerCase() == "xml3d")
						{
							// create transformation
							thus.transformID = thus.id + "transform";
							thus.transform = document.createElementNS(org.xml3d.xml3dNS, "transform");
							thus.transform.setAttribute("id", thus.transformID);
							
							// add suffix to id's in the mesh document
							thus.appendSuffixToIds(doc.documentElement, thus.id);
							
							// function to update location of the mesh
							thus.updateLocation = function(interpolate) {
								var location = Kata.LocationExtrapolate(thus.curLocation, new Date().getTime());
								
								thus.transform.translation = new XML3DVec3(location.pos[0], location.pos[1], location.pos[2]);
								thus.transform.rotation.setQuaternion(new XML3DVec3(location.orient[0], location.orient[1], location.orient[2]), location.orient[3]);
								
								this.gfx.root.update();
								
								return !interpolate;
							}
							
							// place new mesh at the last received location
							thus.updateLocation(false);
							thus.gfx.defs.appendChild(thus.transform);
							
							// create group
							thus.group = document.createElementNS(org.xml3d.xml3dNS, "group");
							thus.group.setAttribute("id", thus.id);
							thus.group.transform = "#" + thus.transformID;
							// TODO: set shader
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
			var viewID = "view" + Math.round(Math.random()*10000000);
			this.view = document.createElementNS(org.xml3d.xml3dNS, "view");
			this.view.setAttribute("id", viewID);
			
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
			this.gfx.root.activeView = "#" + viewID;
		}
		else
			console.error("Cannot set object " + msg.id + " as camera. " +
				"It is already a " + this.objType + ".");
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
		if (this.animations == undefined)
			this.savedAnimation = animationName;
		else if (this.animations[animationName] == undefined) {
			console.error("Cannot animate an object " + this.id + ". Animation '" + animationName + "' does not exist.");
			return;
		} else {
			// stop previous animation
			if (this.runningAnimations != undefined) {
				for (var i in this.runningAnimations) {
					org.xml3d.stopAnimation(this.runningAnimations[i]);
					delete this.runningAnimations[i];
				}
			}
			
			for (var i in this.animations[animationName]) {
				var animRec = this.animations[animationName][i];
				this.runningAnimations.push(org.xml3d.startAnimation(animRec.source, animRec.target, animRec.field, 1000, true));
			}	
		}
	}
	
	XML3DVWObject.prototype.destroy = function() {
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
		
		$(this.root).bind("mousedown", function (e){thus.mouseDown(e)});
		$(this.root).bind("mouseup",   function (e){thus.mouseUp(e)});
		$(this.root).bind("mousemove", function (e){thus.mouseMove(e)});
		$(this.root).bind("scroll",    function (e){thus.scrollWheel(e)});
		$(document).bind("keydown",   function (e){thus.keyDown(e)});
		$(document).bind("keyup",     function (e){thus.keyUp(e)});
		
		// map for pressed keys
		this.keyDownMap = {};
		
		// perform regular updates
		this.scheduledUpdates = [];
		setInterval(Kata.bind(this.update, this), 16);
	};
	
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
		
		this.objects[msg.id].move(msg, msg.interpolate == undefined ? true : msg.interpolate);
	}
	
	XML3DGraphics.prototype.methodTable["animate"] = function(msg) {
		console.log("animate " + msg.id);
		
		if (this.objects[msg.id] === undefined)
			console.error("Cannot animate an object " + msg.id + ". It does not exist.");
		
		this.objects[msg.id].animate(msg.animation);
	}
	
	XML3DGraphics.prototype.methodTable["camera"] = function(msg) {
		console.log("camera " + msg.id);
		
		if (this.objects[msg.id] === undefined)
			console.error("Cannot add a mesh. Object " + msg.id + " does not exist.");
		
		this.objects[msg.id].initCamera();
	}
	
	XML3DGraphics.prototype.methodTable["attachcamera"] = function(msg) {
		console.log("attachcamera " + msg.id);
		
		// TODO: implement
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
	
	XML3DGraphics.prototype.methodTable["unknown"] = function(msg) {
		console.log(msg.msg + " " + msg.id);
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
    
    XML3DGraphics.prototype.extractMouseEventInfo = function(e){
        var ev = {};
        ev.type = e.type;
        ev.shiftKey = e.shiftKey;
        ev.altKey = e.altKey;
        ev.ctrlKey = e.ctrlKey;
        ev.which = e.button;
        ev.x = e.clientX;
        ev.y = e.clientY;
        ev.screenX = e.screenX;
        ev.screenY = e.screenY;
        ev.clientX = e.clientX;
        ev.clientY = e.clientY;
        var el = null;
        if (typeof(e.srcElement) != "undefined") {
            el = e.srcElement;
            ev.width = e.srcElement.clientWidth;
            ev.height = e.srcElement.clientHeight;
        }
        else if (typeof(e.target != "undefined")) {
            el = e.target;
            ev.width = e.target.width;
            ev.height = e.target.height;
        }
        else {
            ev.width = 0;
            ev.height = 0;
        }
        while (el != null) {
            ev.x -= el.offsetLeft || 0;
            ev.y -= el.offsetTop || 0;
            el = el.offsetParent;
        }
        return ev;
    };
    
    XML3DGraphics.prototype.mouseDown = function(e) {
        this._buttonState |= Math.pow(2, e.button);
        var ev = this.extractMouseEventInfo(e);
        var msg = {
            msg: "mousedown",
            event: ev
        };
        if (ev.which == 2) {
            document.body.style.cursor = "crosshair";
        }
        this.inputCallback(msg);
    };
    
    XML3DGraphics.prototype.mouseUp = function(e){
        this._buttonState &= 7 - Math.pow(2, e.button);
        var ev = this.extractMouseEventInfo(e);
        var msg = {
            msg: "mouseup",
            event: ev
        };
        if (ev.which == 2) {
            document.body.style.cursor = "default";
        }
        this.inputCallback(msg);
    };
    
    /*
     * for now, we only send mouse moves if left button depressed
     * otherwise we flood with messages.  Note right button is controlled by OS so we ignore
     */
    XML3DGraphics.prototype.mouseMove = function(e){
        if (this._buttonState) {
            var ev = this.extractMouseEventInfo(e);
            var msg = {
                msg: "mousemove",
                event: ev
            };
            this.inputCallback(msg);
        }
    };

    XML3DGraphics.prototype.keyDown = function(e){
        if (Kata.suppressCanvasKeyInput) return;
        this.keyDownMap[e.keyCode]=-1;
        var ev = {};
        ev.type = e.type;
        ev.keyCode = e.keyCode;
        ev.shiftKey = e.shiftKey;
        ev.altKey = e.altKey;
        ev.ctrlKey = e.ctrlKey;
        var msg = {
            msg: "keydown",
            event: ev
        };
        this.inputCallback(msg);
    };

    XML3DGraphics.prototype.keyUp = function(e) {
        if (!this.keyDownMap[e.keyCode]) {
            return;
        }
        var ev = {};
        ev.type = e.type;
        ev.keyCode = e.keyCode;
        ev.shiftKey = e.shiftKey;
        ev.altKey = e.altKey;
        ev.ctrlKey = e.ctrlKey;
        var msg = {
            msg: "keyup",
            event: ev
        };
        var me=this;
        this.keyDownMap[e.keyCode] = 1;
        setTimeout(function () {                            /// wait to see if we're part of a bogus key repeat
            if (me.keyDownMap[e.keyCode] == 1) {           /// if fail, then keydown (or another keyup?) occured in last 50 ms
                me.keyDownMap[e.keyCode] = 0;              /// if no other events on this key, fire the real keyup event & clear map
                me.inputCallback(msg);
            }
        }, 50);
    };

    XML3DGraphics.prototype.scrollWheel = function(e){
        var ev = {};
        ev.type = e.type;
        ev.shiftKey = e.shiftKey;
        ev.altKey = e.altKey;
        ev.ctrlKey = e.ctrlKey;
        if (e.wheelDelta != null) {         /// Chrome
            ev.dy = e.wheelDelta;
        }
        else {                              /// Firefox
            ev.dy = e.detail * -40;         /// -3 for Firefox == 120 for Chrome
        }
        var msg = {
            msg: "wheel",
            event: ev
        };
        this.inputCallback(msg);
    };
	
    // Register as a GraphicsSimulation if possible.
    Kata.GraphicsSimulation.registerDriver("XML3D", XML3DGraphics);
}, "katajs/gfx/xml3dgfx.js");
