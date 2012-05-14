/*  Kata Javascript Utilities
 *  Channel.js
 *
 *  Copyright (c) 2010, Patrick Reiter Horn
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
], function() {
    /**
     * An abstract parent for a two-way communication channel. You may send
     * messages to this channel, and another party may register listeners who
     * can register to receive message callbacks.
     * @constructor
     */
    Kata.Channel = function () {};

    /**
     * Registers a function to be called when a message is sent.
     * @param {function(Kata.Channel, (string|Object))} listener  A callback func
     */
    Kata.Channel.prototype.registerListener = function (listener) {
        if (!listener.call) {
            if (network_debug) Kata.log("Listener call type is "+typeof(listener));
            if (network_debug) Kata.log("Listener constructor type is "+listener.constructor);
            throw "Error in registerListener: not a function";
        }
        if (!this.mListener) {
            this.mListener = listener;
        } else if (this.mListener instanceof Array) {
            this.mListener.push(listener);
        } else {
            this.mListener = [this.mListener, listener];
        }
    };


    /**
     * Registers a function to be called when a message is sent.
     * @param {function(Kata.Channel, (string|Object))} listener  A callback func
     */
    Kata.Channel.prototype.unregisterListener = function (listener) {
        if (listener==this.mListener) {
            delete this.mListener;
            return true;
        }
        if (this.mListener instanceof Array) {
            for (var i=0;i<this.mListener.length;++i) {
                if (this.mListener[i]==listener) {
                    for (var j=i;j+1<this.mListener.length;++j) {
                        this.mListener[j]=this.mListener[j+1];
                    }
                    this.mListener.pop();
                    return true;
                }
            }
        }
        return false;
    };
    /**
     * Protected function to be called by subclasses when a message has been
     * received and is to be delivered to listeners.
     * @param {string|Object} data  Serializable data to pass to the listeners.
     * @protected
     */
    Kata.Channel.prototype.callListeners = function (data) {
        // Filter for debug messages first
        if (Kata.debugMessage(this, data))
            return;

        if (!this.mListener) {
            Kata.error("Kata.Channel mListener not set");
            return;
        }
        if (this.mListener.call) {
            this.mListener(this, data);
        } else {
            for (var i = 0; i < this.mListener.length; i++) {
                var listener = this.mListener[i];
                listener(this, data);
            }
        }
    };
    /**
     * Abstract function to be called by subclasses when a message has been
     * received and is to be delivered to listeners.
     */
    Kata.Channel.prototype.sendMessage = null;

}, 'katajs/core/Channel.js');
