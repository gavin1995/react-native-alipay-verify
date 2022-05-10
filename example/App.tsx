import React, { Component } from 'react';
import {
  Alert,
  Button,
  StyleSheet,
  Text,
  TextInput,
  View,
  StatusBar,
  DeviceEventEmitter,
  EmitterSubscription,
  AppState,
} from 'react-native';
import AlipayVerify, { ResultStatusCode, AlipayVerifyEvent } from 'react-native-alipay-verify';

type State = {
  bizCode: string,
  name: string,
  no: string,
  isSuccess: boolean
}
export default class App extends Component<any, State> {
  private eventListener: EmitterSubscription | undefined;

  constructor(props: any) {
    super(props);
    this.state = {
      certifyId: '',
      bizCode: '',
      name: '',
      no: '',
      isSuccess: false,
    };
  }

  componentDidMount() {
    AlipayVerify.getBizCode()
      .then((bizCode) => {
        this.setState({ bizCode });
      }).catch((error) => console.log(error));
    // 监听支付宝认证结果
    this.eventListener = DeviceEventEmitter.addListener(AlipayVerifyEvent.EVENT_QUERY_CERTIFY_RESULT, (event) => {
      console.log('监听：' + JSON.stringify(event));
      this.queryCertifyResult(JSON.parse(JSON.stringify(event)).certifyId);
    });
    // 回到前台时处理 认证状态
    AppState.addEventListener('change', (appState) => {
      if (appState === 'active' && this.state.certifyId) {
        console.log('监听：' + appState);
        this.queryCertifyResult(this.state.certifyId);
      }
    });
  }

  componentWillUnmount() {
    this.eventListener && this.eventListener.remove();
  }

  onChangeText(text: string, isNo: boolean) {
    if (isNo) {
      this.setState({ no: text });
    } else {
      this.setState({ name: text });
    }
  }

  submit() {
    let error = '';
    if (!this.state.no) {
      error = '请填写身份证号码';
    }
    if (!this.state.name) {
      error = '请填写真实姓名';
    }
    if (!this.state.bizCode) {
      error = '场景码获取失败';
    }
    if (error) {
      Alert.alert(
        'Error',
        error,
        [{ text: 'OK' }],
      );
      return;
    }
    this.getCertifyData({
      bizCode: this.state.bizCode,
      certName: this.state.name,
      certNo: this.state.no,
    });
  }

  getCertifyData(formData: any) {
    let url = 'http://172.16.1.62:38081/jforum.html?module=aliPayVerifyAction&action=getCertifyData&rqType=ajax&appName=Ly&platform=android';
    url += '&bizCode=' + formData.bizCode + '&certName=' + this.state.name + '&certNo=' + this.state.no;
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }).then((response) => {
      return response.json();
    }).then((json) => {
      console.log(JSON.stringify(json));
      if (json.isSuccess) {
        this.verify(json);
      } else {
        Alert.alert(
          'Message',
          json.message,
          [{ text: 'OK' }],
        );
      }
    }).catch((error) => {
      console.log(error);
    });
  }

  verify(verifyData: any) {
    this.setState({ certifyId: verifyData.certifyId });
    AlipayVerify.verify(verifyData.certifyId, verifyData.certifyUrl).then((verifyResult) => {
      let message = '';
      switch (Number(verifyResult)) {
        case ResultStatusCode.NETWORK_ANOMALY:
          message = '网络异常';
          break;
        case ResultStatusCode.SYSTEM_EXCEPTION:
          message = '系统异常';
          break;
        case ResultStatusCode.USER_CANCEL:
          message = '用户取消认证';
          break;
        case ResultStatusCode.VERIFY_SUCCESS:
          // 向认证服务器 证实 认证结果
          this.queryCertifyResult(verifyData.certifyId);
          break;
        case ResultStatusCode.AWAIT_VERIFY:
          // 等待认证结果， 通过监听方式得到认证结束通知
          break;
        default:
          message = '调起支付宝SDK失败，错误码：' + verifyResult;
          break;
      }
      console.log(message + ' ' + verifyResult);
      if (message) {
        Alert.alert(
          'Message',
          message,
          [{ text: 'OK' }],
        );
      }
    }).catch((error) => console.log(error));
  }

  queryCertifyResult(certifyId: string) {
    let url = 'http://172.16.1.62:38081/jforum.html?module=aliPayVerifyAction&action=queryCertifyResult&rqType=ajax&appName=Ly&platform=android';
    url += '&certifyId=' + certifyId;
    console.log(url);
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }).then((response) => {
      return response.json();
    }).then((json) => {
      console.log(json);
      if (json.isSuccess) {
        this.setState({
          isSuccess: true,
        });
      }
      Alert.alert(
        'Message',
        json.message,
        [{ text: 'OK' }],
      );

    }).catch((error) => {
      console.log(error);
    });
  }

  render() {
    return (
      <View style={styles.container}>
        <StatusBar barStyle={'dark-content'} />
        <View style={{
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#FFFFFF',
          height: 96,
          paddingTop: 30,
        }}>
          <Text style={styles.title}>支付宝实名认证</Text>
        </View>
        {this.state.isSuccess ?
          <View style={{
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FFFFFF',
            padding: 15,
            marginTop: 5,
            width: '100%',
            height: 200,
          }}>
            <Text style={styles.title}>认证成功</Text>
          </View>
          :
          <View style={{ backgroundColor: '#FFFFFF', padding: 15, marginTop: 5 }}>
            <View style={styles.viewRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.instructions, { marginRight: 10 }]}>认证场景码</Text>
              </View>
              <View style={{ flex: 2 }}>
                <TextInput
                  style={styles.input}
                  value={this.state.bizCode}
                  editable={false}
                  placeholder={'未获取到场景码'}
                  placeholderTextColor={'#999999'}
                />
              </View>
            </View>
            <View style={styles.viewRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.instructions, { marginRight: 10 }]}>真实姓名</Text>
              </View>
              <View style={{ flex: 2 }}>
                <TextInput
                  style={styles.input}
                  onChangeText={(text) => this.onChangeText(text, false)}
                  value={this.state.name}
                  placeholder={'请填写您的真实姓名'}
                  placeholderTextColor={'#999999'}
                />
              </View>
            </View>
            <View style={styles.viewRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.instructions, { marginRight: 10 }]}>身份证号码</Text>
              </View>
              <View style={{ flex: 2 }}>
                <TextInput
                  style={styles.input}
                  onChangeText={(text) => this.onChangeText(text, true)}
                  value={this.state.no}
                  keyboardType={'numeric'}
                  placeholder={'请填写您的身份证号码'}
                  placeholderTextColor={'#999999'}
                />
              </View>
            </View>
            <Text style={styles.tips}>* 暂时不支持港澳台、海外地区身份实名认证</Text>
            <Button
              title={'提交'}
              onPress={() => this.submit()}
            />
          </View>
        }
      </View>
    );
  }
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6F7',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
  viewRow: {
    width: '80%',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  input: {
    width: '100%',
    height: 40,
    margin: 0,
    padding: 5,
    color: '#333333',
  },
  title: {
    fontSize: 17,
    color: '#333333',
    lineHeight: 24,
  },
  tips: {
    fontSize: 12,
    color: '#2F86FF',
    lineHeight: 17,
    marginLeft: 10,
    marginTop: 5,
    marginBottom: 10,
  },
});
