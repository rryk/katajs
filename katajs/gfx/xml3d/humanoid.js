Kata.require([
	['externals/xml3d/xml3d.js', 'katajs/gfx/xml3d/xml3d-motion.js']
], function() {


	function Animation(duration, loop, interpolation) {
		this.duration = duration;
		this.loop = loop;
		this.interpolation = interpolation;
		
		this.referencedAnimations = undefined;
	}
		
	function ReferencedAnimation(start, cycles, speed) {
		this.start = start;
		this.cycles = cycles;
		this.speed = speed;
	}

	// CLASS:	HUMANOID ANIMATION PARSER
	// 
	// Parses an external XML-Document and generates animations and humanoids out of it
	//
	HumanoidAnimationParser = function() {

		var xmlhttp; // HTTP-Request-Object
		var xmlDoc;  // XML-Document to be requested and parsed afterwards

		var humanoids = new Object(); // contains parsed humanoids
		var animations = new Object(); // contains parsed animations


		// READ - XML
		// Reads an XML file and parses it to humanoid / animations
		//		- url: The XML document's url to parse
		this.readXML = function(url)
		{
			if (window.XMLHttpRequest)
			  {// code for IE7+, Firefox, Chrome, Opera, Safari
			  xmlhttp=new XMLHttpRequest();
			  }
			else
			  {// code for IE6, IE5
			  xmlhttp=new ActiveXObject("Microsoft.XMLHTTP");
			  }
			xmlhttp.open("GET",url,false);
			xmlhttp.send();
			xmlDoc=xmlhttp.responseXML; 
			
			return xmlDoc;
		}

		// PARSE - HUMANOIDS
		// parses information about humanoids from a previously opened XML-Document
		this.parseHumanoids = function(xmlDoc) {
			humanoidList = xmlDoc.getElementsByTagName("humanoid");
			
			var i = 0;
			for(i = 0; i < humanoidList.length; i++)
			{
				humanoids[humanoidList[i].getAttribute('name')] = humanoidList[i].getAttribute('animation');
			}
			
			return humanoids;
		}

		// PARSE - ANIMATIONS
		// parses animations from a previously loaded XML document for a given animatable
		this.parseAnimations = function(xmlDoc, animatable) {
			
			c = new XMOT.ClientMotionFactory;
			
			if(xmlDoc.getElementsByTagName("animations").length > 0)
			{
				animationList = xmlDoc.getElementsByTagName("animations")[0]; // List of all 'animation'-Tags in the external XML document
				var i = 0;
				
				for(var a = animationList.firstElementChild; a; a = a.nextElementSibling)
				{
					var tmpAnim = new Animation(a.getAttribute('duration'), a.getAttribute('loop'), a.getAttribute('interpolation'));
					// Animation Child Node => Reference Animation given
					if(a.firstElementChild.tagName == "animation")
					{
							var cAnims = a.getElementsByTagName("animation"); // animation child-nodes of current animation-node		
							var refs = new Object(); // list of anims

							var c = 0;
							for(c = 0; c < cAnims.length; c++)
							{	
								// Use default values, if no values specified in XML document							
								var speed = 1;
								
								if( cAnims[c].getAttribute('speed'))
									speed = cAnims[c].getAttribute('speed');
								
								
								refs[cAnims[c].getAttribute('ref')] = new ReferencedAnimation(parseInt(cAnims[c].getAttribute('start'),10),cAnims[c].getAttribute('cycles'),speed);
							}	
							
							tmpAnim.referencedAnimations = refs;
					}
					
					// Create Keyframe animation otherwise
					else
					{
						var kfAnim = c.createKeyframeAnimation(a.getAttribute('id'),a.lastElementChild.getAttribute("name"), a);
						animatable.addAnimation(kfAnim);
					}
					
					animations[a.getAttribute('id')] = tmpAnim;
				}				
	
				return animations;
			}
		}

	};	
}, "katajs/gfx/xml3d/humanoid.js");