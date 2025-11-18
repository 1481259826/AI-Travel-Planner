/**
 * 科大讯飞语音识别 API 封装
 * 使用 WebSocket 实时语音转写服务
 * 文档: https://www.xfyun.cn/doc/asr/voicedictation/API.html
 */

import CryptoJS from 'crypto-js';

export interface XFYunVoiceConfig {
  appId: string;
  apiKey: string;
  apiSecret?: string; // 可选，用于生成签名
  authUrl?: string; // 可选，直接使用预生成的鉴权 URL
}

export interface XFYunTranscribeResult {
  text: string;
  isFinal: boolean;
  confidence?: number;
}

/**
 * 生成科大讯飞 WebSocket 鉴权 URL
 */
export function generateXFYunAuthUrl(config: XFYunVoiceConfig): string {
  const { appId, apiKey, apiSecret } = config;

  if (!apiSecret) {
    throw new Error('科大讯飞语音识别需要 API Secret');
  }

  // 生成 RFC1123 格式的时间戳
  const date = new Date().toUTCString();

  // WebSocket API 地址
  const host = 'iat-api.xfyun.cn';
  const path = '/v2/iat';
  const url = `wss://${host}${path}`;

  // 生成签名
  const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`;
  const signatureSha = CryptoJS.HmacSHA256(signatureOrigin, apiSecret);
  const signature = CryptoJS.enc.Base64.stringify(signatureSha);

  // 生成授权参数
  const authorizationOrigin = `api_key="${apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
  const authorization = btoa(authorizationOrigin);

  // 拼接完整 URL
  const authUrl = `${url}?authorization=${authorization}&date=${encodeURIComponent(date)}&host=${host}`;

  return authUrl;
}

/**
 * 科大讯飞语音识别客户端
 */
export class XFYunVoiceClient {
  private ws: WebSocket | null = null;
  private config: XFYunVoiceConfig;
  private onResultCallback?: (result: XFYunTranscribeResult) => void;
  private onErrorCallback?: (error: Error) => void;
  private audioDataQueue: ArrayBuffer[] = [];
  private isConnected = false;

  constructor(config: XFYunVoiceConfig) {
    this.config = config;
  }

  /**
   * 连接 WebSocket 并开始识别
   */
  async connect(
    onResult: (result: XFYunTranscribeResult) => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // 优先使用预生成的 authUrl，否则现场生成
        const authUrl = this.config.authUrl || generateXFYunAuthUrl(this.config);
        this.ws = new WebSocket(authUrl);
        this.onResultCallback = onResult;
        this.onErrorCallback = onError;

        this.ws.onopen = () => {
          console.log('[XFYun] WebSocket 已连接');
          this.isConnected = true;

          // 发送开始识别参数
          const params = {
            common: {
              app_id: this.config.appId,
            },
            business: {
              language: 'zh_cn', // 中文
              domain: 'iat', // 语音听写
              accent: 'mandarin', // 普通话
              vad_eos: 2000, // 尾点检测（静音超过2s认为结束）
              dwa: 'wpgs', // 动态修正
            },
            data: {
              status: 0, // 开始
              format: 'audio/L16;rate=16000', // 音频格式
              encoding: 'raw',
            },
          };

          this.ws?.send(JSON.stringify(params));

          // 发送音频队列中的数据
          this.audioDataQueue.forEach(data => this.sendAudio(data));
          this.audioDataQueue = [];

          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const response = JSON.parse(event.data);

            if (response.code !== 0) {
              const error = new Error(`科大讯飞识别错误: ${response.message} (code: ${response.code})`);
              this.onErrorCallback?.(error);
              return;
            }

            // 解析识别结果
            if (response.data && response.data.result) {
              const ws = response.data.result.ws;
              let text = '';

              ws.forEach((word: any) => {
                word.cw.forEach((char: any) => {
                  text += char.w;
                });
              });

              const result: XFYunTranscribeResult = {
                text,
                isFinal: response.data.status === 2, // status=2 表示最终结果
                confidence: response.data.result.sn,
              };

              this.onResultCallback?.(result);
            }
          } catch (error) {
            console.error('[XFYun] 解析响应失败:', error);
            this.onErrorCallback?.(error as Error);
          }
        };

        this.ws.onerror = (event) => {
          console.error('[XFYun] WebSocket 错误:', event);
          const error = new Error('科大讯飞 WebSocket 连接失败');
          this.onErrorCallback?.(error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('[XFYun] WebSocket 已关闭');
          this.isConnected = false;
        };
      } catch (error) {
        console.error('[XFYun] 连接失败:', error);
        reject(error);
      }
    });
  }

  /**
   * 发送音频数据
   */
  sendAudio(audioData: ArrayBuffer): void {
    if (!this.isConnected || !this.ws) {
      // 如果未连接，将数据加入队列
      this.audioDataQueue.push(audioData);
      return;
    }

    try {
      // 将音频数据编码为 Base64
      const uint8Array = new Uint8Array(audioData);
      const base64Audio = btoa(String.fromCharCode.apply(null, Array.from(uint8Array)));

      const frame = {
        data: {
          status: 1, // 持续传输
          format: 'audio/L16;rate=16000',
          encoding: 'raw',
          audio: base64Audio,
        },
      };

      this.ws.send(JSON.stringify(frame));
    } catch (error) {
      console.error('[XFYun] 发送音频失败:', error);
      this.onErrorCallback?.(error as Error);
    }
  }

  /**
   * 停止识别
   */
  stop(): void {
    if (this.ws && this.isConnected) {
      // 发送结束帧
      const endFrame = {
        data: {
          status: 2, // 结束
          format: 'audio/L16;rate=16000',
          encoding: 'raw',
          audio: '',
        },
      };

      this.ws.send(JSON.stringify(endFrame));
    }
  }

  /**
   * 关闭连接
   */
  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }
}

/**
 * 将 MediaStream 音频转换为科大讯飞需要的格式
 * 科大讯飞要求: 16k 采样率, 16bit 位深, 单声道
 */
export class AudioProcessor {
  private audioContext: AudioContext;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private onAudioDataCallback?: (data: ArrayBuffer) => void;

  constructor() {
    this.audioContext = new AudioContext({ sampleRate: 16000 });
  }

  /**
   * 开始处理音频流
   */
  startProcessing(
    stream: MediaStream,
    onAudioData: (data: ArrayBuffer) => void
  ): void {
    this.onAudioDataCallback = onAudioData;

    this.sourceNode = this.audioContext.createMediaStreamSource(stream);
    this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.processorNode.onaudioprocess = (event) => {
      const inputData = event.inputBuffer.getChannelData(0);

      // 转换为 16bit PCM
      const pcmData = this.floatTo16BitPCM(inputData);

      // 确保传递的是 ArrayBuffer 类型
      this.onAudioDataCallback?.(pcmData.buffer as ArrayBuffer);
    };

    this.sourceNode.connect(this.processorNode);
    this.processorNode.connect(this.audioContext.destination);
  }

  /**
   * 停止处理
   */
  stopProcessing(): void {
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }
  }

  /**
   * 将 Float32Array 转换为 16bit PCM
   */
  private floatTo16BitPCM(float32Array: Float32Array): Int16Array {
    const pcm = new Int16Array(float32Array.length);

    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      pcm[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    return pcm;
  }

  /**
   * 关闭音频上下文
   */
  close(): void {
    this.stopProcessing();
    this.audioContext.close();
  }
}
