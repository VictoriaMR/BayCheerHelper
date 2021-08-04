// webSocket
const BAYHELPER_SOCKET = {
	init: function() {
		const config = CACHE.getCache('baycheerhelper_auto_robot_set_config');
		//未配置则不生效
		if (!config) {
			bg_alert('请先确认配置, 点击确认开始连接');
			return false;
		}
		let _this = this;
		if (_this.socket) {
			return;
		}
		_this.ioConnectSign = false;
		_this.ioRegisterSign = false;
		_this.ioPingHandler = null;
		_this.ioReconnectInterVal = null;
		_this.allConfig = CACHE.getCache('baycheerhelper_auto_robot_config');
		//实例
		_this.socket = io(domain+':12002');
		//链接成功
		_this.ioConnect(config);
		//断开
		_this.socket.on('disconnect', function(){
			if(_this.ioPingHandler) {
				clearInterval(_this.ioPingHandler);
			}
			console.log('断开连接')
			_this.ioConnectSign = false;
			_this.ioRegisterSign = false;
			_this.ioPingHandler = null;
			//重新链接
			_this.ioReconnectInterVal = setInterval(function(){
				if (_this.ioConnectSign) {
					clearInterval(_this.ioReconnectInterVal);
				} else {
					_this.socket.connect();
				}
			}, 10000);
		});
		//心跳接收
		_this.socket.on('ioPong', function(e) {});
		//注册成功
		_this.socket.on('registerSuccess', function(e) {
			if (!_this.ioRegisterSign) {
				console.log('注册成功');
			}
			_this.ioPing();
			_this.ioRegisterSign = true;
		});
		//注册失败 断开连接
		_this.socket.on('ioClose', function(e) {
			_this.ioConnectSign = false;
			_this.ioRegisterSign = false;
			_this.ioPingHandler = null;
			_this.close();
			console.log('注册失败', e);
			//重新链接
			_this.ioReconnectInterVal = setInterval(function(){
				if (_this.ioConnectSign) {
					clearInterval(_this.ioReconnectInterVal);
				} else {
					_this.socket.connect();
				}
			}, 10000);
		});
		//接收处理请求
		_this.socket.on('autoDeal', function(e) {
			if (e === '') {
				bg_alert('处理请求参数错误');
				return;
			}
			//储存数据
			CACHE.setCache('baycheerhelper_auto_robot_autodeal_data', e, -1);
			//监听网络请求
			if (chrome.webRequest.onHeadersReceived.hasListeners()) {
				chrome.webRequest.onHeadersReceived.removeListener(BAYHELPER_SOCKET.headersCallback);
			}
			chrome.webRequest.onHeadersReceived.addListener(
				BAYHELPER_SOCKET.headersCallback,
				{urls: [e.entry_url.replace('https', '*').replace('http', '*')]},
				["blocking"]
			);
			//url刷新页面
			chrome.tabs.query({}, function(tabArray){
				chrome.tabs.update(tabArray[0].id, { url: e.entry_url });
			});
		});
		//接收处理成功
		_this.socket.on('dealSuccess', function(e) {
			//清除任务缓存
			CACHE.delCache('baycheerhelper_auto_robot_autodeal_data');
			if (_this.callback) {
				_this.callback(e);
				_this.callback = null;
			}
		});
		_this.socket.on('dealFailed', function(e) {
			console.log('处理失败', e);
		});
	},
	headersCallback: function(res) {
		//页面请求失败
		if (this.allConfig) {
			const errorArr = this.allConfig.error_code;
			if (errorArr && errorArr.indexOf(res.statusCode) >= 0) {
				BAYHELPER_SOCKET.dealFailed('页面处理失败');
			}
		}
	},
	ioPing: function() {
		let _this = this;
		clearInterval(_this.ioPingHandler);
		_this.ioPingHandler = setInterval(function() {
			if(_this.ioRegisterSign) {
				_this.socket.emit('ioPing', 'ping');
			}
		}, 20000);
	},
	ioConnect: function(config) {
		let _this = this;
		console.log('重新链接')
		_this.socket.on('connect', function(){
			_this.ioConnectSign = true;
			//注册
			_this.ioRegister(config);
		});
	},
	ioRegister:function(config) {
		//获取uuid
		const uuid = CACHE.getCache('uuid');
		let is_free = 1;
		if (CACHE.getCache('baycheerhelper_auto_robot_autodeal_data')) {
			is_free = 0;
		}
		this.sendMessage('bayHelperRegister', {uuid: uuid, config: config, is_free: is_free});
	},
	updateConfig:function() {
		if (!this.ioConnectSign) {
			bg_alert('socket 连接失败, 请稍后再试!');
			return false;
		}
		if (!this.ioRegisterSign) {
			bg_alert('socket 注册失败, 请稍后再试!');
			return false;
		}
		const config = CACHE.getCache('baycheerhelper_auto_robot_set_config');
		this.sendMessage('bayHelperUpdate', {config: config});
	},
	sendMessage:function(type, data) {
		this.socket.emit(type, data);
	},
	dealSuccess:function(data, callback) {
		this.callback = callback;
		//获取处理数据
		const taskData = this.getTaskData();
		if (taskData) {
			this.sendMessage('bayHelperDealResult', {result: data, taskData: taskData, status: 1, remark: '处理成功'});
		}
	},
	dealFailed:function(data, callback) {
		this.callback = callback;
		//获取处理数据
		const taskData = this.getTaskData();
		if (taskData) {
			this.sendMessage('bayHelperDealResult', {result: data, taskData: taskData, status: 0, remark: '处理失败'});
		}
	},
	getTaskData:function(){
		return CACHE.getCache('baycheerhelper_auto_robot_autodeal_data');
	},
	close: function () {
		if (this.socket) {
			this.ioRegisterSign = false;
			this.ioConnectSign = false;
			clearInterval(this.ioPingHandler);
		}
	}
};