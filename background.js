const domain = 'https://erp.baycheer.com';
const api_url = domain + '/api/';
const expire_time = 60 * 60; //缓存时间
//扩展内通信
chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {
		listener_event(request, sendResponse);
		return true;
	}
);
//监听页面通信 - 跨扩展消息
chrome.runtime.onMessageExternal.addListener(
	function(request, sender, sendResponse) {
		listener_event(request, sendResponse);
		return true;
	}
);
function listener_event(request, sendResponse) {
	let rst;
	switch (request.action) {
		case 'getCookie': //获取cookie
			let cookies='';
			chrome.cookies.getAll({url: request.host },function( cookie ){
				for(let k in cookie){
					cookies+=cookie[k].name+'='+cookie[k].value+';';
				}
				sendResponse({uuid: CACHE.getCache('uuid'), cookies: cookies});
			});
			break;
		case 'getDomainsCookies': //获取多域名cookie
			let domains = request.value;
			if (domains.length > 0) {
				let cookiesList = {};
				chrome.cookies.getAll({},function( cookie ) {
					for (let i=0; i < domains.length; i++) {
						let cookieArr = {};
						for(let k in cookie) {
							if (cookie[k].name && cookie[k].domain.indexOf(domains[i]) >= 0) {
								cookieArr[cookie[k].name] = cookie[k].value;
							}
						}
						cookiesList[domains[i]] = cookieArr;
					}
					sendResponse(cookiesList);
				});
			}
			break;
		case 'getCache':
			rst = CACHE.getCache(request.cache_key);
			sendResponse({code: 0, data: rst, msg: 'success'});
			break;
		case 'setCache':
			rst = CACHE.setCache(request.cache_key, request.value, request.expire);
			sendResponse({code: 0, data: rst, msg: 'success'});
			break;
		case 'delCache':
			rst = CACHE.delCache(request.cache_key);
			sendResponse({code: 0, data: rst, msg: 'success'});
			break;
		case 'request_api': //http请求 传cache_key时先取缓存
			if (request.cache_key) {
				rst = CACHE.getCache(request.cache_key);
				if (rst) {
					sendResponse({data: rst, code: 0});
					return false;
				}
			}
			getApi(api_url + request.value, request.param, function(res) {
				if (res.code === 0 || res.code === '0') {
					CACHE.setCache(request.cache_key, res.data, request.expire);
				}
				sendResponse(res);
			});
			break;
		case 'alert': //全局弹窗
			bg_alert(request.value);
			break;
		case 'init_socket': //socket连接
			//确认按钮点击
			if (request.value === 'confirm') {
				if (BAYHELPER_SOCKET.socket) {
					BAYHELPER_SOCKET.updateConfig();
				} else {
					BAYHELPER_SOCKET.init();
				}
			} else {
				BAYHELPER_SOCKET.init();
			}
			sendResponse();
			break;
		case 'dealAutoSuccess': //自动机器人处理数据成功请求
			BAYHELPER_SOCKET.dealSuccess(request.value, sendResponse);
			break;
		case 'dealAutoFailed': //自动化处理失败, 不能处理数据
			BAYHELPER_SOCKET.dealFailed(request.value, sendResponse);
			break;
		case 'getAutoInfo': //获取机器人信息
			if (BAYHELPER_SOCKET.ioRegisterSign) {
				getAutoInfo(sendResponse);
			} else {
				setTimeout(function(){
					getAutoInfo(sendResponse);
				}, 1000);
			}
			break;
		case 'requestChannel':
			getApi(request.value, request.param, function(res) {
				sendResponse(res);
			}, request.type, request.dataType);
			break;
	}
	return true;
}
function getAutoInfo(sendResponse) {
	let status = 0;
	let statusText = '未连接';
	//空闲开启中
	if (BAYHELPER_SOCKET.ioRegisterSign) {
		status = 1;
		statusText = '连接中';
	}
	//处理中
	let config = CACHE.getCache('baycheerhelper_auto_robot_autodeal_data');
	if (config) {
		status = 2;
		statusText = '处理任务中';
	} else {
		config = {};
	}
	config.status = status;
	config.statusText = statusText;
	sendResponse(config);
}
//在整个页面中间alert
function bg_alert(msg) {
	alert(msg);
}
function bg_console(msg) {
	console.log('msg', msg)
}
function socket_close() {
	BAYHELPER_SOCKET.close();
}
//发送请求
function getApi(url, param, callback, type, dataType) {
	if (typeof type === 'undefined') {
		type = 'POST';
	}
	if (typeof dataType === 'undefined') {
		dataType = 'json';
	}
	$.ajax({
		url: url,
		data: param,
		type: type,
		dataType: dataType,
		success: function(res) {
			if (callback) {
				callback(res);
			}
		},
		error: function (jqXHR) {
			if (callback) {
				callback({code: -1, data: '', msg: '请求失败, 请和管理人员联系'});
			}
		}
	});
}
function getCache(key) {
	return CACHE.getCache(key);
}
function setCache(key, value, expire) {
	return CACHE.setCache(key, value, expire);
}
function delCache(key) {
	return CACHE.delCache(key);
}
//缓存方法
const CACHE = {
	getCache: function(key) {
		if (!key) {
			return false;
		}
		let data = localStorage.getItem(key);
		if (!data) {
			return false;
		}
		try {
			if (typeof JSON.parse(data) === 'object') {
				data = JSON.parse(data);
			}
		} catch(e) {
			return data;
		}
		if (data.expire === '-1' || data.expire === -1) {
			return data.content;
		}
		if (parseInt(data.expire) <= this.getTime()) {
			this.delCache(key);
			return false;
		}
		return data.content;
	},
	setCache: function(key, value, expire) {
		if (!key || !value) {
			return false;
		}
		if (expire === '-1' || expire === -1) {
			//to do
		} else {
			if (typeof expire === 'undefined') {
				expire = this.getTime() + expire_time;
			} else {
				expire = this.getTime() + expire;
			}
		}
		const data = {expire: expire, content: value};
		localStorage.setItem(key, JSON.stringify(data));
		return true;
	},
	delCache: function(key) {
		if (!key) {
			return false;
		}
		localStorage.removeItem(key);
		return true;
	},
	getTime: function() {
		return parseInt(new Date().getTime() / 1000);
	}
};