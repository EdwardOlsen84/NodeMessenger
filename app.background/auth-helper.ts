import { VKConsts } from '../app/vk-consts';
import { SessionInfo } from '../app/session-info';

export class AuthHelper {
    static user_denied: string = 'user_denied';
    //static client_id: number = 5573653;
    static client_id: number = 3769260;
    static auth_url: string = "https://oauth.vk.com/authorize?";
    static redirect_uri: string = "https://oauth.vk.com/blank.html";
    static scope: string = "messages,users,friends,status,offline";
    static display: string = "page"; 
    static response_type: string = "token";
    static tab_id: number;
    static authorization_in_progress_count: number = 0;

    static authorize(background: boolean = true, requested_by_user: boolean = false) {
        console.log('start authorization');
        if (AuthHelper.authorization_in_progress_count > 0) {
            console.log('another authorisation in progress, cancel request');
            return;
        }
        if (window.localStorage.getItem(AuthHelper.user_denied) === 'true' && !requested_by_user) {
            return;
        }
        AuthHelper.authorization_in_progress_count ++;
        let authUrl: string = AuthHelper.auth_url 
            + "client_id=" + AuthHelper.client_id
            + "&scope=" + AuthHelper.scope
            + "&redirect_uri=" + AuthHelper.redirect_uri
            + "&display=" + AuthHelper.display
            + "&response_type=" + AuthHelper.response_type
            + "&v=" + VKConsts.api_version;
        chrome.tabs.create({url: authUrl, selected: !background}, tab => AuthHelper.tab_id = tab.id);
    }

    static addTabListener() {
        chrome.tabs.onUpdated.addListener(function (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) {
            if (tabId == AuthHelper.tab_id && tab.url.split('#')[0] === AuthHelper.redirect_uri && tab.status === 'complete') {
                console.log('found auth tab');
                let session: SessionInfo = new SessionInfo();
                let query: string[] = tab.url.split('#')[1].split('&');
                let error: any;
                for (let parameter of query) {
                    let key: string = parameter.split('=')[0]; 
                    let value: string = parameter.split('=')[1];

                    switch (key) {
                        case 'access_token':
                            session.access_token = value;
                            window.localStorage.setItem(VKConsts.vk_access_token_id, value);
                            break;
                        case 'user_id':
                            session.user_id = value;
                            window.localStorage.setItem(VKConsts.vk_user_id, value);
                            break;
                        case 'expires_in':
                            session.token_exp = 86400;
                            window.localStorage.setItem(VKConsts.vk_token_expires_in_id, '86400');
                            break;
                        case 'error':
                            error = {};
                            error.error = value
                            break;
                        case 'error_reason':
                            error.error_reason=value;
                            break;
                        case 'error_description':
                            error.error_description=value;
                            break;
                    } 
                }
                if (error) {
                    AuthHelper.processError(error);
                }
                else {
                    session.timestamp = Math.floor(Date.now() / 1000);
                    console.log('store session');
                    window.localStorage.setItem(VKConsts.vk_session_info, JSON.stringify(session));
                    window.localStorage.setItem(VKConsts.vk_auth_timestamp_id, String(Math.floor(Date.now() / 1000)));
                }
                chrome.tabs.remove(tabId);
                AuthHelper.tab_id = null;
                AuthHelper.authorization_in_progress_count --;
            }
        });
    }

    static processError(error) {
        console.log('error ocured during authorization: ' + JSON.stringify(error));
        switch (error.error_reason) {
            case 'user_denied':
                console.log('user cancelled authorization request, only manual authorization is possible');
                window.localStorage.setItem(AuthHelper.user_denied, 'true');
                break;
            default:
                console.log('unknown error');
                break;
        }
    }

    static clearSession() {
        window.localStorage.removeItem(VKConsts.vk_session_info);
    }
}

/*
https://oauth.vk.com/blank.html#access_token=d0e5d749479a6aeedccf617f2164efee2b6329fdd8e983b66655646aeaf659ab2ad2ac3929d4fa7645a09&expires_in=0&user_id=54570222
 */