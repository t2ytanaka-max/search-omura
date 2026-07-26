import React from 'react';
import { 
  Compass, 
  ShieldCheck, 
  Cpu, 
  ArrowLeft, 
  MessageCircle, 
  Download, 
  AlertTriangle, 
  Smartphone, 
  Laptop, 
  HelpCircle, 
  Sliders,
  Bell,
  Volume2,
  MapPin,
  Trash2,
  Zap
} from 'lucide-react';

export default function GuideView({ onGoBack }) {
  return (
    <div className="h-[100dvh] w-full bg-gray-950 text-white font-sans overflow-y-auto select-none">
      
      {/* ナビゲーションバー */}
      <header className="sticky top-0 bg-gray-900/95 backdrop-blur border-b border-gray-800 z-50 px-4 py-3">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            {onGoBack ? (
              <button
                type="button"
                onClick={onGoBack}
                className="p-2 bg-gray-800 hover:bg-gray-700 active:scale-95 rounded-xl transition-all text-gray-400 hover:text-white cursor-pointer"
              >
                <ArrowLeft size={16} className="text-rescue-500" />
              </button>
            ) : (
              <div className="w-8 h-8 bg-rescue-500 rounded-lg flex items-center justify-center shadow-lg">
                <Compass size={18} className="text-white" />
              </div>
            )}
            <div>
              <h1 className="text-sm font-black tracking-tight text-white">Search大村市消防団</h1>
              <p className="text-[8px] text-rescue-500 font-mono tracking-wider font-bold">USER GUIDE & MANUAL</p>
            </div>
          </div>
          <div className="text-[10px] text-gray-400 font-bold bg-gray-950 px-3 py-1 rounded-full border border-gray-800">
            公式利用者ガイド v2.2.0
          </div>
        </div>
      </header>

      {/* メインビジュアル */}
      <section className="relative bg-gradient-to-b from-gray-900 via-gray-950 to-gray-950 py-10 px-4 border-b border-gray-900">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="flex flex-wrap justify-center items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rescue-500/10 text-rescue-500 text-xs font-black rounded-full border border-rescue-500/20">
              <Cpu size={12} /> 次世代山岳救助支援システム
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 text-blue-400 text-xs font-mono font-black rounded-full border border-blue-500/20">
              v2.2.0 最新アプデ完了
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white leading-tight">
            Search大村市消防団<br />
            <span className="text-lg md:text-xl text-rescue-400 font-extrabold">公式取扱説明書 ＆ 最新機能マニュアル v2.2.0</span>
          </h2>
          <p className="text-xs md:text-sm text-gray-400 max-w-xl mx-auto leading-relaxed font-medium">
            電波の届かない・または極めて微弱な日本の山岳エリアにおいて、消防団員の現在地と安全状況を指揮本部にリアルタイムで伝達・視覚化し、迅速かつ安全な山岳捜索・救助を実現する完全オフライン・衛星通信連携システムです。
          </p>
        </div>
      </section>

      {/* メインコンテンツ */}
      <main className="max-w-4xl mx-auto py-8 px-4 space-y-10">
        
        {/* v2.2.0 新機能ハイライト */}
        <section className="bg-gradient-to-r from-orange-950/40 via-gray-900 to-orange-950/40 p-5 sm:p-6 rounded-3xl border-2 border-rescue-500/40 space-y-4 shadow-2xl">
          <div className="flex items-center gap-2.5 border-b border-rescue-500/30 pb-3">
            <Zap size={22} className="text-rescue-400 animate-pulse shrink-0" />
            <div>
              <h3 className="text-base font-black text-white">v2.2.0 新登場！最新の目玉機能</h3>
              <p className="text-[11px] text-rescue-300 font-bold">団員スマホのスリープ連携 ＆ 本部着信チャイム・ポップアップの全自動化</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-black/50 p-4 rounded-2xl border border-gray-800 space-y-2">
              <div className="flex items-center gap-2 text-rescue-400 font-black text-xs">
                <Bell size={16} /> 1. 団員スマホ：スリープ（画面消灯）中も指令通知
              </div>
              <p className="text-xs text-gray-300 leading-relaxed font-medium">
                団員スマホがポケットの中で画面が真っ暗なスリープ状態であっても、本部からの指示を受信した瞬間にOSが画面を自動点灯。大音量警報・バイブとともに「🚨 本部からの緊急指示」がロック画面上に即座にポップアップ通知されます。
              </p>
            </div>

            <div className="bg-black/50 p-4 rounded-2xl border border-gray-800 space-y-2">
              <div className="flex items-center gap-2 text-orange-400 font-black text-xs">
                <Volume2 size={16} /> 2. 本部画面：全報告の着信チャイム ＋ 巨大ポップアップ
              </div>
              <p className="text-xs text-gray-300 leading-relaxed font-medium">
                団員が「捜索開始」「現在地報告」「要救助者発見」「救助要請」「危険箇所」「捜索終了」や伝達テキストを押した際、本部PCから「ピンポンパンポン♪」チャイムが鳴り、画面中央にダイアログが飛翔表示されます。「地図で確認」を押すと現場位置へ一発ズーム移動します。
              </p>
            </div>
          </div>
        </section>

        {/* 重要コンセプト */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-gray-900/60 border border-gray-850 p-5 rounded-2xl space-y-3 shadow-xl">
            <div className="w-10 h-10 bg-blue-600/10 border border-blue-500/20 rounded-xl flex items-center justify-center text-blue-400">
              <Cpu size={20} />
            </div>
            <h3 className="text-base font-black text-white">人工衛星との直接通信（衛星アンテナ対応）</h3>
            <p className="text-xs text-gray-400 leading-relaxed font-medium">
              スターリンク等の人工衛星とスマートフォン間の直接通信（Direct to Cell）に対応。送受信データを「数十バイトの軽量テキスト」に極限まで圧縮し、通信応答を待たずに連続自動送信（楽観的送信）を行うことで、衛星通信下でも途切れることなくデータを届けることが可能です。
            </p>
          </div>

          <div className="bg-gray-900/60 border border-gray-850 p-5 rounded-2xl space-y-3 shadow-xl">
            <div className="w-10 h-10 bg-emerald-600/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
              <ShieldCheck size={20} />
            </div>
            <h3 className="text-base font-black text-white">個人情報を一切取り扱わない安心設計</h3>
            <p className="text-xs text-gray-400 leading-relaxed font-medium">
              救助団員のプライバシー保護とセキュリティの観点から、個人名の登録・ログイン情報は不要です。活動時には「任意の所属名（例：1班、15分団 等）」と「自動生成される匿名ランダムID」のみで識別し、個人情報は一切取り扱いません。
            </p>
          </div>
        </div>

        {/* 1. 公式LINE連携 */}
        <section className="bg-gray-900/40 p-5 rounded-2xl border border-gray-850 space-y-3 shadow-lg">
          <h3 className="text-base font-black text-white border-l-4 border-rescue-500 pl-3 flex items-center gap-2">
            <MessageCircle size={18} className="text-rescue-500" /> 本アプリについて（公式LINE連携）
          </h3>
          <p className="text-xs text-gray-400 leading-relaxed font-medium">
            団員専用の「大村市消防団公式LINEアカウント」のトークメニュー内に配置されたボタンから、ワンタップで直接本システムにアクセス・起動できます。LINEと併用することで、災害時・捜索活動時に迅速に捜索隊形を構築できます。
          </p>
        </section>

        {/* 2. ホーム画面への追加手順 */}
        <section className="bg-gray-900/40 p-5 rounded-2xl border border-gray-850 space-y-4 shadow-lg">
          <h3 className="text-base font-black text-white border-l-4 border-rescue-500 pl-3 flex items-center gap-2">
            <Download size={18} className="text-rescue-500" /> スマホのホーム画面に追加する（導入手順）
          </h3>
          <p className="text-xs text-gray-400 leading-relaxed font-medium">
            ホーム画面に追加することで、一般のネイティブアプリと同様にアイコンから直接起動し、スリープ通知や全画面でストレスなく使用できます。活動前に必ず追加しておいてください。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-black/40 border border-gray-850 p-4 rounded-xl space-y-2">
              <span className="text-[10px] font-black bg-blue-900/40 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full uppercase">iPhone (Safari) の手順</span>
              <ul className="list-decimal pl-4 text-xs text-gray-400 space-y-1.5 font-medium leading-relaxed">
                <li>Safariで本アプリを開きます。</li>
                <li>下部の <strong className="text-white">共有アイコン（四角から上矢印）</strong> をタップします。</li>
                <li><strong className="text-white">「ホーム画面に追加」</strong> をタップします。</li>
              </ul>
            </div>

            <div className="bg-black/40 border border-gray-850 p-4 rounded-xl space-y-2">
              <span className="text-[10px] font-black bg-emerald-900/40 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase">Android (Chrome) の手順</span>
              <ul className="list-decimal pl-4 text-xs text-gray-400 space-y-1.5 font-medium leading-relaxed">
                <li>Chromeで本アプリを開きます。</li>
                <li>右上の <strong className="text-white">3点リーダー（縦に丸3つ）</strong> をタップします。</li>
                <li><strong className="text-white">「ホーム画面に追加」</strong> または「アプリをインストール」を選択します。</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 3. アプリ操作マニュアル */}
        <section className="space-y-5">
          <h3 className="text-base font-black text-white border-l-4 border-rescue-500 pl-3 flex items-center gap-2">
            <Sliders size={18} className="text-rescue-500" /> アプリ詳細操作マニュアル v2.2.0
          </h3>

          <div className="space-y-5">
            {/* 3.1 団員用端末の操作手順 */}
            <div className="bg-gray-900/30 p-5 rounded-2xl border border-gray-850 space-y-3">
              <div className="flex items-center gap-2 border-b border-gray-850 pb-2">
                <Smartphone size={18} className="text-blue-400" />
                <h4 className="text-sm font-black text-white">【現場活動団員用】スマートフォンの操作手順</h4>
              </div>
              <ul className="list-decimal pl-4 text-xs text-gray-400 space-y-3 leading-relaxed font-medium">
                <li>
                  <strong className="text-white block mb-0.5">① 所属の記入と「スリープ通知許可」</strong>
                  画面最上部に所属名（例：15分団、1班）を入力します。また、上部に表示される **「🔔 スリープ中通知を有効にする」** バナーを一度タップして許可しておくと、画面消灯中も指示通知が届きます。
                </li>
                <li>
                  <strong className="text-white block mb-0.5">② 捜索の開始と手動現在地報告</strong>
                  「捜索開始」ボタンを押すと、青く「現在地報告」と点滅表示に切り替わります。捜索中は定期的にタップして最新位置を本部に送信します。
                </li>
                <li>
                  <strong className="text-white block mb-0.5">③ 状況に応じた手動報告（即時ローカル描画）</strong>
                  「異状なし」「要救助者発見」「救助要請」「危険箇所」などの報告ボタンを押した瞬間、送信結果を待つことなく自分の地図上にカラーピンが即座にプロットされます。車移動中（時速40km等）でも全自動追従・送信されます。
                </li>
                <li>
                  <strong className="text-white block mb-0.5">④ 現場伝達事項（テキスト）の送信</strong>
                  メッセージ（例: 北側尾根にて倒木あり通行不可）を入力し送信すると、本部画面へ「ピンポンパンポン♪」チャイム音と巨大ダイアログで即座に届きます。
                </li>
                <li>
                  <strong className="text-white block mb-0.5">⑤ 捜索の終了</strong>
                  活動完了時は「捜索終了」ボタンをタップします。ボタンの点滅が消え、セッションが正常クローズされます。
                </li>
                <li>
                  <strong className="text-white block mb-0.5">⑥ 多良岳山系全域・最詳細オフライン拡大地図（全2,000〜2,700枚）</strong>
                  「地図」タブから「多良岳山系全域を一括保存」を押すと、山岳核心部の最詳細拡大地形図（縮尺1/6,250極詳細図）が一括ダウンロードされます。圏外の山中で拡大しても等高線・分岐・谷筋が鮮明に表示されます。
                </li>
              </ul>
            </div>

            {/* 3.2 本部指令画面の操作手順 */}
            <div className="bg-gray-900/30 p-5 rounded-2xl border border-gray-850 space-y-3">
              <div className="flex items-center gap-2 border-b border-gray-850 pb-2">
                <Laptop size={18} className="text-emerald-400" />
                <h4 className="text-sm font-black text-white">【指揮本部用】PC・タブレットの操作手順</h4>
              </div>
              <ul className="list-decimal pl-4 text-xs text-gray-400 space-y-3 leading-relaxed font-medium">
                <li>
                  <strong className="text-white block mb-0.5">① 地図モニターによるリアルタイム自動追跡</strong>
                  全分団の「現在地」と「捜索軌跡」がリアルタイム描画されます。本部でピンを長押し削除すると、現場の全団員スマホ地図からも即座に消去連動されます。
                </li>
                <li>
                  <strong className="text-white block mb-0.5">② 現場からの全報告（ST01〜ST06）ポップアップ ＆ チャイム音</strong>
                  現場で「捜索開始」「現在地報告」「要救助者発見」「救助要請」「危険箇所」「捜索終了」や伝達テキストが送信されると、4和音チャイムとともに画面中央にダイアログが表示されます。「地図で位置を確認」を押すと現場位置へ一発スムーズ移動します。
                </li>
                <li>
                  <strong className="text-white block mb-0.5">③ 全団員への緊急指示と大音量アラーム</strong>
                  特定班または全団員へメッセージを送信でき、団員スマホで大音量サイレンが響きます。
                </li>
                <li>
                  <strong className="text-white block mb-0.5">④ 指令履歴の一括削除 ＆ 全団員スマホのリアルタイム一括消去</strong>
                  「本部指令履歴を一括削除」ボタンを押すと、現場の全団員スマホの「指示履歴」タブも一瞬で0件に綺麗に自動同期消去されます。
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* 4. 運用上の注意事項 */}
        <section className="bg-gray-900/40 p-5 rounded-2xl border border-gray-850 space-y-4 shadow-lg">
          <h3 className="text-base font-black text-white border-l-4 border-rescue-500 pl-3 flex items-center gap-2">
            <AlertTriangle size={18} className="text-rescue-500" /> 運用上の注意事項（重要）
          </h3>
          <ul className="list-disc pl-4 text-xs text-gray-400 space-y-2.5 leading-relaxed font-medium">
            <li>
              <strong className="text-white">位置情報の権限：</strong>
              スマホの位置情報許可を<strong className="text-rescue-500 font-bold">「常に許可」</strong>または「アプリの使用中のみ許可」に設定してください。
            </li>
            <li>
              <strong className="text-white">衛星通信時の高速自動送信：</strong>
              衛星通信（Starlink / Direct to Cell等）接続時、1件目の応答を待たずに連続して高速自動送信（楽観的送信）されます。
            </li>
            <li>
              <strong className="text-white">危険箇所（紫ピン）の安全保護：</strong>
              「危険箇所(紫ピン)」は他班の安全のため一括削除後も自動保護されます。解決後は本部で長押し削除すると現場画面からも連動消去されます。
            </li>
          </ul>
        </section>

        {/* 5. よくある質問 (FAQ) */}
        <section className="bg-gray-900/50 p-5 rounded-2xl border border-gray-800 space-y-4 shadow-xl">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <HelpCircle size={18} className="text-rescue-500" /> よくある質問 (FAQ)
          </h3>
          <div className="space-y-3 text-xs font-medium">
            <div className="space-y-1">
              <h4 className="font-black text-white">Q. 団員スマホがスリープ（画面真っ暗）でも通知は届きますか？</h4>
              <p className="text-gray-400 leading-relaxed">
                A. はい！最初に画面上部の「通知を許可する」ボタンを押して許可しておけば、スマホがポケットの中で画面が真っ暗な状態であっても、本部からの指示が届いた瞬間にOSが画面を自動点灯させ、音とバイブでロック画面上に通知バナーがポップアップ表示されます。
              </p>
            </div>

            <div className="space-y-1 border-t border-gray-850 pt-2.5">
              <h4 className="font-black text-white">Q. 地図の事前保存の枚数とデータ容量は？</h4>
              <p className="text-gray-400 leading-relaxed">
                A. 「多良岳山系全域を一括保存」を押すと、最詳細拡大地形図（全2,000〜2,700枚）が保存されます。容量はスマホ写真数枚分と同等の**わずか約25MB**ですので、ストレージを圧迫しません。
              </p>
            </div>

            <div className="space-y-1 border-t border-gray-850 pt-2.5">
              <h4 className="font-black text-white">Q. 本部指令画面を複数箇所のPCやスマホで同時起動しても大丈夫ですか？</h4>
              <p className="text-gray-400 leading-relaxed">
                A. はい、全く問題ありません。データベース（Firebase）の自動同期機能により、すべての本部端末の地図やログがリアルタイムで同一同期されます。
              </p>
            </div>
          </div>
        </section>

      </main>

    </div>
  );
}
