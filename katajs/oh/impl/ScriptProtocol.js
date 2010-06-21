/*  Kata Javascript Network Layer
 *  ScriptProtocol.js
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

(function() {

     /** Script protocol contains classes for inter-thread
      * communication with a script, i.e. the objects that should be
      * used to send information back and forth between the script and
      * the object host. These generally contain no methods -- they
      * are intended to be a simple protocol -- so their are only
      * methods for constructing and dispatching these messages.
      *
      * Messages fall into one of two categories: FromScript for
      * messages generated by the script and destined for the object
      * host, and ToScript for messages generated by the object host
      * and destined for the script.  Most ToScript messages are
      * wrapped in a Presence message to simplify dispatching to the
      * appropriate handler.
      *
      * This is mostly boiler-plate code, just constructing the
      * objects in a way that supports updates, improvements, and
      * refactoring in the future, instead of specifying objects
      * directly in javascript.
      */
     Kata.ScriptProtocol = {

         FromScript : {

             Types : {
                 Connect : 1,
                 Disconnect : 2,
                 Location : 3,
                 Visual : 4
             },

             Connect : function(space, auth) {
                 this.__type = Kata.ScriptProtocol.FromScript.Types.Connect;
                 this.space = space;
                 this.auth = auth;
             },

             Disconnect : function(space) {
                 this.__type = Kata.ScriptProtocol.FromScript.Types.Disconnect;
                 this.space = space;
             },

             /** Location update.  Providing a subset of the information is permitted.
              */
             Location : function(space, position, velocity, acceleration, bounds) {
                 this.__type = Kata.ScriptProtocol.FromScript.Types.Location;
                 this.space = space;
                 this.position = position;
                 this.velocity = velocity;
                 this.acceleration = acceleration;
                 this.bounds = bounds;
             },

             Visual : function(space, url) {
                 this.__type = Kata.ScriptProtocol.FromScript.Types.Visual;
                 this.space = space;
                 this.url = url;
             }
         },

         ToScript : {

             Types : {
                 Connected : 1,
                 Disconnected : 2,
                 Presence : 3
             },

             Connected : function(space, id) {
                 this.__type = Kata.ScriptProtocol.ToScript.Types.Connected;
                 this.space = space;
                 this.id = id;
             },

             Disconnected : function(space) {
                 this.__type = Kata.ScriptProtocol.ToScript.Types.Disconnected;
                 this.space = space;
             },

             Presence : function(space, payload) {
                 this.__type = Kata.ScriptProtocol.ToScript.Types.Presence;
                 this.space = space;
                 this.payload = payload;
             }

         }
     };

})();
