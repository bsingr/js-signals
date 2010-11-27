/*!
 * JS Signals <https://github.com/millermedeiros/js-signals>
 * Released under the MIT license (http://www.opensource.org/licenses/mit-license.php)
 * @author Miller Medeiros <http://millermedeiros.com>
 * @version 0.3
 * @build 55 11/27/2010 01:01 AM
 */
(function(){
	
	/**
	 * @namespace Signals Namespace - Custom event/messaging system based on AS3 Signals
	 * @name signals
	 */
	var signals = window.signals = {};

	/**
	 * Signal - custom event broadcaster inpired by Robert Penner's AS3Signals <https://github.com/robertpenner/as3-signals/>
	 * @author Miller Medeiros
	 * @constructor
	 */
	signals.Signal = function(){
		/**
		 * @type Array.<SignalBinding>
		 * @private
		 */
		this._bindings = [];
	};
	
	
	signals.Signal.prototype = {
		
		/**
		 * @type boolean
		 * @private
		 */
		_shouldPropagate : true,
		
		/**
		 * @type boolean
		 * @private
		 */
		_isEnabled : true,
		
		/**
		 * @param {Function} listener
		 * @param {boolean} isOnce
		 * @param {Object} scope
		 * @return {signals.SignalBinding}
		 * @private
		 */
		_registerListener : function _registerListener(listener, isOnce, scope){
			var prevIndex = this._indexOfListener(listener),
				binding;
			
			if(prevIndex !== -1){ //avoid creating a new Binding for same listener if already added to list
				binding = this._bindings[prevIndex];
				if(binding.isOnce() !== isOnce){
					throw new Error('You cannot '+ (isOnce? 'add()' : 'addOnce()') +' then '+ (!isOnce? 'add()' : 'addOnce()') +' the same listener without removing the relationship first.');
				}
			} else {
				binding = new signals.SignalBinding(listener, isOnce, scope, this);
				this._bindings.push(binding);
			}
			
			return binding;
		},
		
		/**
		 * @param {Function} listener
		 * @return {int}
		 * @private
		 */
		_indexOfListener : function _indexOfListener(listener){
			var n = this._bindings.length;
			while(n--){
				if(this._bindings[n].listener === listener) return n;
			}
			return -1;
		},
		
		/**
		 * Add a listener to the signal.
		 * @param {Function} listener	Signal handler function.
		 * @param {Object} scope	Context on which listener will be executed (object that should represent the `this` variable inside listener function).
		 * @return {signals.SignalBinding} An Object representing the binding between the Signal and listener.
		 */
		add : function add(listener, scope){
			return this._registerListener(listener, false, scope);
		},
		
		/**
		 * Add listener to the signal that should be removed after first execution (will be executed only once).
		 * @param {Function} listener	Signal handler function.
		 * @param {Object} scope	Context on which listener will be executed (object that should represent the `this` variable inside listener function).
		 * @return {signals.SignalBinding} An Object representing the binding between the Signal and listener.
		 */
		addOnce : function addOnce(listener, scope){
			return this._registerListener(listener, true, scope);
		},
		
		/**
		 * Remove a single listener from the dispatch queue.
		 * @param {Function} listener	Handler function that should be removed.
		 * @return {Function} Listener handler function.
		 */
		remove : function remove(listener){
			var i = this._indexOfListener(listener);
			if(i !== -1){
				this._bindings.splice(i, 1);
			}
			return listener;
		},
		
		/**
		 * Remove all listeners from the Signal.
		 */
		removeAll : function removeAll(){
			this._bindings.length = 0;
		},
		
		/**
		 * @return {uint} Number of listeners attached to the Signal.
		 */
		getNumListeners : function getNumListeners(){
			return this._bindings.length;
		},
		
		/**
		 * Disable Signal, will block dispatch to listeners until `enable()` is called.
		 * @see signals.Signal.prototype.enable
		 */
		disable : function disable(){
			this._isEnabled = false;
		},
		
		/**
		 * Enable broadcast to listeners.
		 * @see signals.Signal.prototype.disable
		 */
		enable : function enable(){
			this._isEnabled = true;
		}, 
		
		/**
		 * @return {boolean} If Signal is currently enabled and will broadcast message to listeners.
		 */
		isEnabled : function isEnabled(){
			return this._isEnabled;
		},
		
		/**
		 * Stop propagation of the event, blocking the dispatch to next listeners on the queue.
		 * - should be called only during signal dispatch, calling it before/after dispatch won't affect signal broadcast. 
		 */
		halt : function halt(){
			this._shouldPropagate = false;
		},
		
		/**
		 * Dispatch Signal to all listeners added to the queue. 
		 * @param {...*} params	Parameters that should be passed to each handler.
		 */
		dispatch : function dispatch(params){
			if(! this._isEnabled) return;
			
			var paramsArr = Array.prototype.slice.call(arguments),
				bindings = this._bindings.slice(), //clone array in case add/remove items during dispatch
				i = 0,
				cur;
			
			this._shouldPropagate = true; //in case `halt` was called before dispatch or during the previous dispatch.
						
			while(cur = bindings[i++]){
				if(cur.execute(paramsArr) === false || !this._shouldPropagate) break; //execute all callbacks until end of the list or until a callback returns `false` or stops propagation
			}
		},
		
		/**
		 * @return {string} String representation of the object.
		 */
		toString : function toString(){
			return '[Signal isEnabled: '+ this._isEnabled +' numListeners: '+ this.getNumListeners() +']';
		}
		
	};
	
	/**
	 * Class that represents a Signal Binding.
	 * <br />- Constructor probably won't need to be called by end-user.
	 * <br />- inspired by Joa Ebert AS3 SignalBinding and Robert Penner's Slot classes.
	 * @author Miller Medeiros
	 * @constructor
	 * @param {Function} listener	Handler function binded to the signal.
	 * @param {boolean} isOnce	If binding should be executed just once.
	 * @param {Object} listenerScope	Context on which listener will be executed (object that should represent the `this` variable inside listener function).
	 * @param {signals.Signal} signal	Reference to Signal object that listener is currently binded to.
	 */
	signals.SignalBinding = function SignalBinding(listener, isOnce, listenerScope, signal){
		
		/**
		 * Handler function binded to the signal.
		 * @type Function
		 */
		this.listener = listener;
		
		/**
		 * If binding should be executed just once.
		 * @type boolean
		 * @private
		 */
		this._isOnce = isOnce;
		
		/**
		 * Context on which listener will be executed (object that should represent the `this` variable inside listener function).
		 * @type Object
		 */
		this.listenerScope = listenerScope;
		
		/**
		 * Reference to Signal object that listener is currently binded to.
		 * @type signals.Signal
		 * @private
		 */
		this._signal = signal;
	};
	
	
	signals.SignalBinding.prototype = {
		
		/**
		 * @type boolean
		 * @private
		 */
		_isEnabled : true,
		
		/**
		 * Call listener passing arbitrary parameters.
		 * @param {Array} paramsArr	Array of parameters that should be passed to the listener
		 * @return {*} Value returned by the listener.
		 */
		execute : function execute(paramsArr){
			if(this._isEnabled){
				if(this._isOnce) this._signal.remove(this.listener);
				return this.listener.apply(this.listenerScope, paramsArr);
			}
		},
		
		/**
		 * Disable SignalBinding, block listener execution. Listener will only be executed after calling `enable()`.  
		 * @see signals.SignalBinding.enable()
		 */
		disable : function disable(){
			this._isEnabled = false;
		},
		
		/**
		 * Enable SignalBinding. Enable listener execution.
		 * @see signals.SignalBinding.pause()
		 */
		enable : function enable(){
			this._isEnabled = true;
		},
		
		/**
		 * @return {boolean} If SignalBinding is currently paused and won't execute listener during dispatch.
		 */
		isEnabled : function isEnabled(){
			return this._isEnabled;
		},
		
		/**
		 * @return {boolean} If SignalBinding will only be executed once.
		 */
		isOnce : function isOnce(){
			return this._isOnce;
		},
		
		/**
		 * @return {string} String representation of the object.
		 */
		toString : function toString(){
			return '[SignalBinding listener: '+ this.listener +', isOnce: '+ this._isOnce +', isEnabled: '+ this._isEnabled +', listenerScope: '+ this.listenerScope +']';
		}
		
	};
}());