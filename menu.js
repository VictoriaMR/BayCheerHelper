$(function(){
    let uuid;
    //获取background中的function 调用
    const bg = chrome.extension.getBackgroundPage();
    uuid = bg.getCache('uuid');
    if(typeof uuid!='string' || !uuid){
        uuid = createNonstr(32);
        bg.setCache('uuid',uuid, -1);
    }
    $('#ext_uuid').html(uuid);

    function createNonstr(len){
        let arr = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
        let str='';
        for(let i=0;i<len;++i){
            str+=arr[Math.round(Math.random()*(arr.length-1))];
        }
        return str;
    }
    $('#reset_cookie').click(function(){
        bg.listener_event({action: 'request_api', value: 'BayHelper/cookie', param: {cookieString:'clearCookie',domain:'taobao.com',uuid:uuid}}, function(res) {
            if(res.code===0||res.code==='0'){
                bg.bg_alert('重置COOKIE成功');
            }else{
                bg.bg_alert(res.msg);
            }
        });
    });
    bg.listener_event({action: 'request_api', value: 'BayHelper/getBaycheerHelperData', param: {opn: 'all'}, cache_key: 'baycheerhelper_all_cache_data'}, function(res) {
        if (res.code === 0 || res.code === '0') {
            if (res.data.bayhelper_func) {
                const func = res.data.bayhelper_func;
                let html = '';
                for (let i=0;i<func.length;i++) {
                    html += '<div class="setting-content">\
                                <label class="setting-title">'+func[i].title+'</label>\
                                <div class="switch-p close" id="'+func[i].name+'_switch_status">\
                                    <div class="switch-s close"></div>\
                                </div>\
                            </div>';
                }
                $('#function-content').html(html);
                //按钮初始化
                $('.switch-p').each(function(){
                    const name = $(this).attr('id');
                    let status = bg.getCache(name);
                    if (!status) {
                        status = '0';
                    }   
                    init_switch(name, status);
                });
            }
        }
    })
    //按钮初始化方法
    function init_switch(key, switch_status, reload) {
        const obj = $('#'+key);
        if (switch_status === '0') {
            obj.removeClass('open').addClass('close').find('.switch-s').removeClass('open').addClass('close');
        } else {
            obj.removeClass('close').addClass('open').find('.switch-s').removeClass('close').addClass('open');
        }
        if (reload) {
            chrome.tabs.reload(); //刷新当前页面
        }
    }
    $('.switch-p').click(function(){
        let status = '0';
        const key = $(this).attr('id');
        if ($(this).hasClass('close')) {
            status = '1';
        }
        bg.setCache(key, status, -1);
        init_switch(key, status, true);
    });
});