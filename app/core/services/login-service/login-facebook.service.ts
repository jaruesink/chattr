"use strict";

// import Angular 2
import {Injectable, Inject} from "angular2/core";
import {RouteConfig, Route, RouterOutlet, RouterLink, Router} from "angular2/router";
import {LoginService} from "../login-service/login.service";
import {ConnectService} from "../connect-service/connect.service";
import {AccountService} from "../account-service/account.service";

@Injectable()
export class FacebookLoginService {
    FB: any = window.FB;
    status: any;
    response: any;
    token: string;
    id: string;
    account_request: any;
    error: any;

    constructor(private router:Router, public loginService:LoginService, private connect:ConnectService, public accountService:AccountService) {
        console.log('Facebook login service is loaded.');
    }

    getStatus(doNext:any, onFail?:any) {
      var status = new Promise((resolve:any, reject:any) => {
          this.FB.getLoginStatus((response:any) => {
              this.status = response.status;
              if ( this.status === 'connected' ) {
                  resolve('I am connected.');
              } else {
                  reject(Error('I am not connected.'));
              }
          });
      });
      status.then((connected_success:any) => {
          console.log(connected_success);
          doNext();
      }, (connected_error:any) => {
          onFail();
          console.log(connected_error);
      });
    }

    getInfo(doNext:any) {
      var info = new Promise((resolve:any, reject:any) =>  {
          this.FB.api('/me?fields=name,email,id', (response:any) => {
              this.loginService.name = response.name;
              this.loginService.email = response.email;
              console.log('info received: ', response);
              if (this.loginService.name && this.loginService.email ) {
                  resolve('I have received info.');
              } else {
                  reject(Error('I have not received info.'));
              }
          });
      });
      info.then((get_info_success) => {
          console.log(get_info_success);
          doNext();
      }, (get_info_error) => {
          console.log(get_info_error);
      });
    }

    loginWithFacebook() {
      this.loginService.fb_loading.emit(true);
      this.getStatus(() => {
        // Connected
        this.getInfo( () => {
            this.loginService.userLogin('facebook');
        });
      }, () => {
        // Not Connected
        var facebookLogin = new Promise((resolve:any, reject:any) => {
            this.FB.login( (response:any) => {
                console.log(response);
                if ( response.authResponse ) {
                  this.token = response.authResponse.accessToken;
                  this.id = response.authResponse.userID;
                  resolve('You are logged in, your id is: '+ this.id);
                } else {
                  reject(Error('Logging in with Facebook failed.'));
                }
            });
        });
        facebookLogin.then((login_success:any) => {
            console.log(login_success);
            this.loginWithFacebook();
        }, (login_error:any) => {
            this.loginService.fb_loading.emit(false);
            console.log(login_error);
        });
      });
    }

    createAccountWithFacebook(name:string, username:string, email:string, phone:string, photo_url:string) {
      console.log(this.loginService.loginType);
      var accountRequest:any = {};
      accountRequest['name']        = name;
      accountRequest['username']    = username;
      accountRequest['email']       = email;
      accountRequest['phone']       = phone;
      accountRequest['photo_url']   = photo_url;
      accountRequest['credentials'] = {};
      accountRequest['credentials'].type  = this.loginService.loginType;
      accountRequest['credentials'].id    = this.id;
      accountRequest['credentials'].token = this.token;
      console.log('Account Request: ', accountRequest);
      this.connect.post(this.loginService.register_url, accountRequest,
          (response:any) => {
              console.log(response);
              if (response.auth_token) {
                  this.accountService.setUser(name, username, email, phone, photo_url);
                  this.loginService.accountExists = true;
                  this.loginService.bad_phone = false;
                  this.loginService.userLogin('facebook');
              }
          },
          (fail:any) => {
              console.log(fail);
              if (fail.status === 422) {
                  this.loginService.bad_phone = true;
              }
          });
    }
}
