localStorage.setItem('baycheerhelper_extid', chrome.runtime.id);
//获取uuid是否存在
chrome.runtime.sendMessage({action: 'getCache', cache_key: 'uuid'}, function(res){
	if (!res.data) {
		chrome.runtime.sendMessage({action: 'alert', value: '请单击BayCheer助手插件, 配置令牌'});
	}
});
//引入erp初始化文件(这个相当于一个目录文件,在文件里边再判断要不要加载功能)
chrome.runtime.sendMessage({action: 'request_api', value: 'BayHelper/getBaycheerHelperData', cache_key: 'baycheerhelper_all_cache_data', param:{opn: 'all'}}, function(res) {
	if (res.code === 0 || res.code === '0') {
		loadStatic('js', 'baycheerHelper/baycheerHelper_init.js', res.data.version);
	} else {
		chrome.runtime.sendMessage({action: 'alert', value: res.msg});
	}
});

//引入页面静态文件
function loadStatic(action, value, version) {
	var common_url = 'https://erp.baycheer.com/';
	let obj = document.querySelector('head');
	if (!obj) {
		return false;
	}
	let url = common_url+action+'/'+value;
	if (typeof version !== 'undefined') {
		url += '?v='+version;
	}
	switch (action) {
		case 'js': //加载js
			let script = document.createElement('script');
			script.src = url;
			script.type = 'text/javascript';
			script.charset = 'utf-8';
			obj.appendChild(script);
			break;
	}
}