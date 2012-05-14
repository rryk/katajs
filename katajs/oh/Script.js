/*  Kata Javascript Network Layer
 *  Script.js
 *
 *  Copyright (c) 2010, Ewen Cheslack-Postava
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
"use strict";


Kata.require([
    'katajs/oh/impl/ScriptProtocol.js',
    'katajs/oh/Presence.js',
    'katajs/oh/RemotePresence.js',
    'katajs/oh/odp/Port.js',
    'katajs/oh/odp/Service.js'
], function() {

     /** Script is the base class for all scripts.  It should cover
      * all the necessary basic inter-thread communication.  It
      * provides convenient wrappers for basic functionality so the
      * user is never sending messages across the channel to the main
      * thread manually.
      *
      * Note that a lot of the heavy lifting is actually performed by
      * Presences, which are generated by Scripts upon connection to a
      * space.
      *
      * @constructor
      * @param {Kata.Channel} channel the channel used to communicate
      * with the HostedObject this script belongs to
      * @param {Array} args additional arguments passed by the creating
      * object
      */
     Kata.Script = function (channel, args) {
         Kata.ODP.Service.prototype.constructor.call(
             this,
             Kata.bind(this._sendODPMessage, this)
         );

         this.mChannel = channel;
         this.mChannel.registerListener( Kata.bind(this._handleHostedObjectMessage, this));

         this.mPresences = {};
         this.mRemotePresences = {};

         this.mConnectRequests = {};
         var handlers = {};
         var msgTypes = Kata.ScriptProtocol.ToScript.Types;
         handlers[msgTypes.Connected] = Kata.bind(this._handleConnected, this);
         handlers[msgTypes.ConnectionFailed] = Kata.bind(this._handleConnectFailed, this);
         handlers[msgTypes.Disconnected] = Kata.bind(this._handleDisconnect, this);
         handlers[msgTypes.ReceiveODPMessage] = Kata.bind(this._handleReceiveODPMessage, this);
         handlers[msgTypes.QueryEvent] = Kata.bind(this._handleQueryEvent, this);
         handlers[msgTypes.PresenceLocUpdate] = Kata.bind(this._handlePresenceLocUpdate, this);
         this.mMessageDispatcher = new Kata.MessageDispatcher(handlers);

         this.mBehaviors = [];
     };
     Kata.extend(Kata.Script, Kata.ODP.Service.prototype);

     Kata.Script.prototype.addBehavior = function(behavior) {
         this.mBehaviors.push(behavior);
     };

     /** Send a message to the HostedObject.
      */
     Kata.Script.prototype._sendHostedObjectMessage = function (data) {
         return this.mChannel.sendMessage(data);
     };


     /** Request a presence in the given space.
      *  @param {Kata.SpaceID} space ID of the space to connect to
      *  @param {string} auth authentication information to pass to the space
      *  @param {function(Kata.Presence)} cb callback to invoke upon completion
      *  @param {boolean=} query Enable querying for all RemotePresences (false)
      */
     Kata.Script.prototype.connect = function(args, auth, cb, query) {
         var msg = new Kata.ScriptProtocol.FromScript.Connect(args.space, auth, args.loc, args.visual, query);
         this.mConnectRequests[args.space] = cb;
         this._sendHostedObjectMessage(msg);
     };

     /** Request that the given presence be disconnected from the space.
      *  @param {Kata.Presence} pres the Presence to disconnect
      */
     Kata.Script.prototype._disconnect = function(pres) {
         var msg = new Kata.ScriptProtocol.FromScript.Disconnect(pres.space(), pres.id());
         this._sendHostedObjectMessage(msg);
     };

     Kata.Script.prototype._handleConnected = function(channel, msg) {
         var presence = new Kata.Presence(this, Kata.URL(msg.space), msg.id, msg.loc, msg.visual, msg.physics);

         this.mPresences[msg.space] = presence;

         // Notify normal script
         var cb = this.mConnectRequests[presence.space()];
         if (cb) {
             delete this.mConnectRequests[presence.space()];
             cb(presence);
         }

         // Notify behaviors
         this.mBehaviors.forEach(function(beh) {
             if (beh.newPresence) beh.newPresence(presence);
         });
     };
     Kata.Script.prototype._handleConnectFailed = function(channel,msg) {
         var cb = this.mConnectRequests[msg.space];
         if (cb) {
             delete this.mConnectRequests[msg.space];
             cb(null, msg.space, msg.reason?msg.reason:"Disconnected");
         }
     };
     Kata.Script.prototype._handleDisconnect = function(channel, msg) {
         var invalidated = this.mPresences[msg.space];
         if (!invalidated) return;

         delete this.mPresences[msg.space];

         this.mBehaviors.forEach(function(beh) {
             if (beh.presenceInvalidated) beh.presenceInvalidated(invalidated);
         });
     };
     /** Request a callback after the specified amount of time.  If
      * repeat is true, will repeat every freq period.
      *
      * @param {Kata.Duration} freq amount of time to wait before
      * invoking the timer
      * @param {function()} cb a callback to invoke when the timer expires
      * @param {bool} repeat
      * @returns {Kata.Timer} timer object which can be used to cancel
      * or update the timer.
      *
      */
     Kata.Script.prototype.timer = function(freq, cb, repeat) {
//         Kata.notImplemented("Script.timer");
         return null;
     };

     /** Have the object host instantiate a new object.
      * @param {string} script the script to execute for the object
      * @param {function()} cons the constructor for the object
      * @param {Array} args the arguments for the constructor
      */
     Kata.Script.prototype.createObject = function(script, cons, args) {
         var msg = new Kata.ScriptProtocol.FromScript.CreateObject(script, cons, args);
         this._sendHostedObjectMessage(msg);
     };
     Kata.Script.prototype.queryUpdate = function (space,id,solidAngle){
         var msg = new Kata.ScriptProtocol.FromScript.QueryUpdate(space,id,solidAngle);;
         this._sendHostedObjectMessage(msg);
     };
     Kata.Script.prototype.queryRemoval = function (space,id){
         var msg = new Kata.ScriptProtocol.FromScript.QueryRemoval(space,id);
         this._sendHostedObjectMessage(msg);
     };
     Kata.Script.prototype.Persistence = {};
     /** Request the given data be read.
      * @param readset set of keys to be read
      */
     Kata.Script.prototype.Persistence.read = function(readset) {
         Kata.notImplemented("Script.read");
     };

     /** Request the given data be read.
      * @param writeset map of keys to data to be written
      */
     Kata.Script.prototype.Persistence.write = function(writeset) {
         Kata.notImplemented("Script.write");
     };

     /** Handle messages received from the HostedObject.  This just
      * parses and dispatches to individual handler functions.
      */
     Kata.Script.prototype._handleHostedObjectMessage = function(channel, data) {
         data = Kata.ScriptProtocol.ToScript.reconstitute(data);
         this.mMessageDispatcher.dispatch(channel, data);
     };
     /**
      * STATIC function to create a key for remote presence
      */
     Kata.Script.remotePresenceKey=function(space,objectid) {
         return space+objectid;
     };

    Kata.Script.prototype.getRemotePresence = function(presenceID) {
        return this.mRemotePresences[ Kata.Script.remotePresenceKey(presenceID.space(), presenceID.object()) ];
    };

     Kata.Script.prototype._handleQueryEvent = function(channel, msg) {
         var presence = this.mPresences[msg.space];
         var remote=null;
         var key = Kata.Script.remotePresenceKey(msg.space,msg.observed);
         if (msg.entered) {
             // Check if we have one that's in the process of being killed
             remote = this.mRemotePresences[key];
             if (remote) {
                 if (remote._killTimeout) {
                     clearTimeout(remote._killTimeout);
                     delete remote._killTimeout;
                 }
             }
             else {
                 // New object, create presence and notify
                 remote = new Kata.RemotePresence(presence, msg.space, msg.observed, msg.loc, msg.visual);
                 this.mRemotePresences[key] = remote;
                 presence.remotePresence(remote, true);

                 this.mBehaviors.forEach(
                     function(beh) {
                         if (beh.remotePresence) beh.remotePresence(presence, remote, true);
                     }
                 );
                 this._handleQueryEventDelegate(remote, msg);
             }
         }
         else {
             // Object exited, invalidate presence and notify
             remote = this.mRemotePresences[key];
             if (!remote) {
                 Kata.warn("Got removal prox event for unknown object.");
                 return remote;
             }
             if (remote._killTimeout) {
                 // Already registered
                 return remote;
             }
             var self = this;
             remote._killTimeout = setTimeout(
                 function() {
                     delete self.mRemotePresences[key];
                     presence.remotePresence(remote, false);

                     self.mBehaviors.forEach(
                         function(beh) {
                             if (beh.remotePresence) beh.remotePresence(presence, remote, false);
                         }
                     );
                     self._handleQueryEventDelegate(remote, msg);
                 },
                 10000
             );
         }
         return remote;
     };

     Kata.Script.prototype._handleQueryEventDelegate = function(channel, msg) {
     };

    /** Internal helper method to construct and send an ODP message. */
    Kata.Script.prototype._sendODPMessage = function(src, dst, payload) {
        if (!Kata.URL.equals(src.space(),dst.space()))
            throw "Mismatching spaces in ODP message.";
        var msg = new Kata.ScriptProtocol.FromScript.SendODPMessage(
            src.space(),
            src.object(), src.port(),
            dst.object(), dst.port(),
            payload
        );
        this._sendHostedObjectMessage(msg);
    };

    /** Internal helper method to construct and send an ODP message
     * when it is already in the ObjectMessage protocol format. This
     * is a bit silly, since we're wasting effort doing encode ->
     * decode -> move to network thread -> encode -> send, but
     * currently we get already packaged ODP messages from SST.
     */
    Kata.Script.prototype._sendPreparedODPMessage = function(space, odp_msg) {
        var msg = new Kata.ScriptProtocol.FromScript.SendODPMessage(
            space,
            odp_msg.source_object, odp_msg.source_port,
            odp_msg.dest_object, odp_msg.dest_port,
            odp_msg.payload
        );
        this._sendHostedObjectMessage(msg);
    };

    /** Handle an received ODP message. */
    Kata.Script.prototype._handleReceiveODPMessage = function(channel, msg) {
        // Reconstruct and then delegate to ODP.Service.
        this._deliverODPMessage(
            new Kata.ODP.Endpoint(msg.space, msg.source_object, msg.source_port),
            new Kata.ODP.Endpoint(msg.space, msg.dest_object, msg.dest_port),
            msg.payload
        );
    };

     Kata.Script.prototype._handlePresenceLocUpdate = function(channel, msg) {
         var presence = this.mPresences[msg.space];
         if (presence) {
             return presence._handleLocEvent(msg, this.mRemotePresences);
         }
         else {
             Kata.warn("Got loc update destined for unknown object.");
             return presence;
         }
     };

     Kata.Script.prototype._handleStorageEvent = function(data) {
     };

}, 'katajs/oh/Script.js');
