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

Kata.include("katajs/oh/impl/ScriptProtocol.js");
Kata.include("katajs/oh/Presence.js");

(function() {

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
      * @param {} args additional arguments passed by the creating
      * object
      */
     Kata.Script = function (channel, args) {
         this.mChannel = channel;
         this.mChannel.registerListener( Kata.bind(this._handleHostedObjectMessage, this));

         this.mPresences = {}; // FIXME real hash table
     };

     /** Send a message to the HostedObject.
      */
     Kata.Presence.prototype._sendHostedObjectMessage = function (data) {
         return this.mChannel.sendMessage(data);
     };


     /** Request a presence in the given space.
      *  @param {Kata.SpaceID} space ID of the space to connect to
      *  @param {} auth authentication information to pass to the space
      *  @param {} cb callback to invoke upon completion
      */
     Kata.Script.prototype.connect = function(space, auth, cb) {
         Kata.notImplemented();
     };

     /** Request a callback after the specified amount of time.  If
      * repeat is true, will repeat every freq period.
      *
      * @param {Kata.Duration} freq amount of time to wait before
      * invoking the timer
      * @param {} cb a callback to invoke when the timer expires
      * @param {bool} repeat
      * @returns {Kata.Timer} timer object which can be used to cancel
      * or update the timer.
      *
      */
     Kata.Script.prototype.timer = function(freq, cb, repeat) {
         Kata.notImplemented();
         return null;
     };


     Kata.Script.prototype.Persistence = {};
     /** Request the given data be read.
      * @param readset set of keys to be read
      */
     Kata.Script.prototype.Persistence.read = function(readset) {
         Kata.notImplemented();
     };

     /** Request the given data be read.
      * @param writeset map of keys to data to be written
      */
     Kata.Script.prototype.Persistence.write = function(writeset) {
         Kata.notImplemented();
     };

     /** Handle messages received from the HostedObject.  This just
      * parses and dispatches to individual handler functions.
      */
     Kata.Script.prototype._handleHostedObjectMessage = function(data) {
         Kata.notImplemented();
         // _handlePresenceEvent (dispatched to Presence, which does
         // finer-grained interpretation)
         //
         // _handleStorageEvent (for object host local storage,
         // although it isn't clear what this will mean
         //
         // timers? cdn requests? external requests (e.g. xmlhttp)?
         // anything else?
     };


     Kata.Script.prototype._handlePresenceEvent = function(data) {
         // this.mPresences[data.PresenceID].handleSpaceEvent(Disconnected, data.reason);
     };

     Kata.Script.prototype._handleStorageEvent = function(data) {
     };

})();
