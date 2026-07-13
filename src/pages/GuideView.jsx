import React from 'react';
import { 
  Compass, 
  ShieldCheck, 
  Cpu, 
  WifiOff, 
  ArrowLeft, 
  Send, 
  AlertOctagon, 
  HelpCircle, 
  Smartphone, 
  MessageCircle, 
  Download, 
  AlertTriangle, 
  Laptop, 
  MapPin, 
  Sliders
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
                className="p-2 bg-gray-800 hover:bg-gray-700 active:scale-95 rounded-xl transition-all text-gray-400 hover:text-white"
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
            公式利用者ガイド
          </div>
        </div>
      </header>

      {/* メインビジュアル */}
      <section className="relative bg-gradient-to-b from-gray-900 via-gray-950 to-gray-950 py-16 px-4 border-b border-gray-900">
        <div className="max-w-3xl mx-auto text-center space-y-5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rescue-500/10 text-rescue-500 text-xs font-black rounded-full border border-rescue-500/20">
            <Cpu size={12} /> 次世代山岳救助支援アプリ
          </span>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white leading-tight">
            Search大村市消防団<br />
            <span className="text-xl md:text-2xl text-gray-300 font-bold">公式マニュアル ＆ 利用規約</span>
          </h2>
          <p className="text-xs md:text-sm text-gray-400 max-w-xl mx-auto leading-relaxed">
            本アプリは、電波の極めて微弱な日本の山岳エリアにおいて、消防団員の現在地と安全状況を本部にリアルタイムで伝達するために設計された、超軽量・オフライン対応 of 山岳捜索支援システムです。
          </p>
        </div>
      </section>

      {/* メインコンテンツ */}
      <main className="max-w-4xl mx-auto py-10 px-4 space-y-12">
        
        {/* 重要コンセプト（強調事項） */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 特徴1 */}
          <div className="bg-gray-900/60 border border-gray-850 p-6 rounded-2xl space-y-4 shadow-xl">
            <div className="w-12 h-12 bg-blue-600/10 border border-blue-500/20 rounded-xl flex items-center justify-center text-blue-400">
              <Cpu size={24} />
            </div>
            <h3 className="text-lg font-black text-white">人工衛星との直接通信を想定</h3>
            <p className="text-xs text-gray-400 leading-relaxed font-medium">
              スターリンクなどの人工衛星とスマートフォン間の直接通信（Direct to Cell）を考慮し、送受信データをわずか**「数十バイトのCSVテキスト1行」**に極限まで圧縮。画像の送受信などを一切排除し、模擬圏外や微弱な電波環境下でも通信エラーを起こさず確実にデータを届けることが可能です。
            </p>
          </div>

          {/* 特徴2 */}
          <div className="bg-gray-900/60 border border-gray-850 p-6 rounded-2xl space-y-4 shadow-xl">
            <div className="w-12 h-12 bg-emerald-600/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-lg font-black text-white">個人情報を一切取り扱わない設計</h3>
            <p className="text-xs text-gray-400 leading-relaxed font-medium">
              救助団員のプライバシー保護とセキュリティの観点から、個人名の登録・ログイン情報は不要です。活動時には**「任意の所属名（例：1班、15分団 等）」**と**「自動生成される匿名ランダムID」**のみで識別し、氏名・住所・電話番号などの個人情報はシステム上で一切取り扱いません。
            </p>
          </div>
        </div>

        {/* 1. 本アプリについて（公式LINEアカウント） */}
        <section className="bg-gray-900/40 p-6 rounded-2xl border border-gray-850 space-y-5 shadow-lg">
          <h3 className="text-lg font-black text-white border-l-4 border-rescue-500 pl-3 flex items-center gap-2">
            <MessageCircle size={20} className="text-rescue-500" /> 本アプリについて（公式LINE連携）
          </h3>
          <p className="text-xs text-gray-400 leading-relaxed font-medium">
            本アプリは、大村市消防団のデジタル化推進の一環として開発された専用ツールです。
            団員専用の**「大村市消防団公式LINEアカウント」**のトークメニュー内に配置されたボタンから、ワンタップで直接本システムにアクセス・起動できるようリンクが用意されています。LINEと併用して活用することで、災害時・捜索活動時にスムーズに起動して迅速に捜索隊形を構築することができます。
          </p>
          <div className="bg-gray-950/50 p-3 rounded-lg border border-gray-850/60 text-[11px] text-gray-400 flex items-start gap-2.5 font-medium leading-normal">
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full mt-1 shrink-0"></div>
            <div>
              <span className="text-white font-bold block mb-0.5">公式LINEからの呼び出し手順:</span>
              LINEの公式消防団アカウントのメニューから「山岳捜索サポーター（本アプリ）」をタップするだけで、IDの新規発行と初期化がバックグラウンドで行われ、即座に活動体制に入ることができます。
            </div>
          </div>
        </section>

        {/* 2. スマホのホーム画面に追加する（導入方法） */}
        <section className="bg-gray-900/40 p-6 rounded-2xl border border-gray-850 space-y-6 shadow-lg">
          <h3 className="text-lg font-black text-white border-l-4 border-rescue-500 pl-3 flex items-center gap-2">
            <Download size={20} className="text-rescue-500" /> スマホのホーム画面に追加する（導入手順）
          </h3>
          <p className="text-xs text-gray-400 leading-relaxed font-medium">
            本アプリはWebブラウザで動作しますが、スマートフォンのホーム画面に追加することで、一般のネイティブアプリと同様にアイコンから直接起動し、全画面モード（アドレスバーが表示されない状態）で広く快適に使用できるようになります。活動前に必ず追加しておいてください。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* iOS (Safari) */}
            <div className="bg-black/40 border border-gray-850 p-4.5 rounded-xl space-y-3">
              <span className="text-[10px] font-black bg-blue-900/40 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-full uppercase">iPhone (Safari) の手順</span>
              <ul className="list-decimal pl-4 text-xs text-gray-400 space-y-2 font-medium leading-relaxed">
                <li>iPhone標準のブラウザ <strong className="text-white">Safari</strong> で本アプリを開きます。</li>
                <li>画面下部中央にある <strong className="text-white">共有アイコン（四角から上矢印が飛び出したマーク）</strong> をタップします。</li>
                <li>表示されたメニューを下にスクロールし、<strong className="text-white">「ホーム画面に追加」</strong> をタップします。</li>
                <li>右上の「追加」を押すと、ホーム画面に「山岳捜索」のアイコンが登録されます。</li>
              </ul>
            </div>

            {/* Android (Chrome) */}
            <div className="bg-black/40 border border-gray-850 p-4.5 rounded-xl space-y-3">
              <span className="text-[10px] font-black bg-emerald-900/40 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full uppercase">Android (Chrome) の手順</span>
              <ul className="list-decimal pl-4 text-xs text-gray-400 space-y-2 font-medium leading-relaxed">
                <li>Google標準ブラウザ <strong className="text-white">Chrome</strong> で本アプリを開きます。</li>
                <li>画面右上にある <strong className="text-white">3点リーダー（縦に丸が3つ並んだマーク）</strong> をタップします。</li>
                <li>メニューから <strong className="text-white">「アプリをインストール」</strong> または <strong className="text-white">「ホーム画面に追加」</strong> をタップします。</li>
                <li>確認ポップアップが出ますので「インストール（追加）」を選択すると登録されます。</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 3. アプリ操作マニュアル */}
        <section className="space-y-6">
          <h3 className="text-lg font-black text-white border-l-4 border-rescue-500 pl-3 flex items-center gap-2">
            <Sliders size={20} className="text-rescue-500" /> アプリ操作マニュアル
          </h3>

          <div className="space-y-6">
            {/* 3.1 団員用端末の操作手順 */}
            <div className="bg-gray-900/30 p-6 rounded-2xl border border-gray-850 space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-850 pb-2">
                <Smartphone size={18} className="text-blue-400" />
                <h4 className="text-sm font-black text-white">【活動団員用】スマートフォンの操作方法</h4>
              </div>
              <ul className="list-decimal pl-4.5 text-xs text-gray-400 space-y-3 leading-relaxed font-medium">
                <li>
                  <strong className="text-white block mb-0.5">① 所属の記入</strong>
                  画面最上部の「所属記入」の枠に、所属名（例：15分団、1班 など）を入力します。名前や電話番号などの個人情報は入力不要です。入力内容は次回以降も自動で保存されます。
                </li>
                <li>
                  <strong className="text-white block mb-0.5">② 捜索の開始と手動現在地報告</strong>
                  「捜索開始」ボタンをタップします。タップ後、ボタンが青く「現在地報告(ボタンを押して下さい)」と点滅を始めます。捜索中は、この点滅ボタンを定期的にタップして現在地を手動送信してください。自動送信を行わないことでスマートフォンのバッテリー消費を大幅に抑制しています。
                </li>
                <li>
                  <strong className="text-white block mb-0.5">③ 状況に応じた手動報告</strong>
                  異状を見つけたり、要救助者を発見したり、自身が危険に遭遇した際は、画面内の該当ボタン（「異状なし」「要救助者発見」「救助要請」など）をいつでもタップして即座に現在位置とステータスを本部に報告可能です。
                </li>
                <li>
                  <strong className="text-white block mb-0.5">④ 伝達事項(テキスト)の送信</strong>
                  「伝達事項」テキストエリアにメッセージ（例: 倒木あり通行不可）を全角最大30文字以内で入力し、右側の「紙飛行機（送信）」ボタンを押すことで、現在のステータスを維持したまま文字情報を本部に即時送信できます。
                </li>
                <li>
                  <strong className="text-white block mb-0.5">⑤ 捜索の終了</strong>
                  無事に捜索が完了し、下山準備に移る際は「捜索終了」ボタンをタップします。これによりボタンの点滅が消え、初期の「捜索開始」状態に戻ります。
                </li>
                <li>
                  <strong className="text-white block mb-0.5">⑥ オフライン地図の利用</strong>
                  「地図」タブから事前にオフライン地図をダウンロードしておくと、山中の圏外エリアでも携帯電波を使わずに国土地理院の等高線地形図上に自分の現在地を表示することができます。
                </li>
              </ul>
            </div>

            {/* 3.2 本部指令画面の操作手順 */}
            <div className="bg-gray-900/30 p-6 rounded-2xl border border-gray-850 space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-850 pb-2">
                <Laptop size={18} className="text-emerald-400" />
                <h4 className="text-sm font-black text-white">【本部指令用】PC・タブレットの操作方法</h4>
              </div>
              <ul className="list-decimal pl-4.5 text-xs text-gray-400 space-y-3 leading-relaxed font-medium">
                <li>
                  <strong className="text-white block mb-0.5">① 地図モニターによる追跡</strong>
                  地図上にアクティブなすべての分団の「現在地（赤いラベル）」と「これまでの捜索軌跡（赤い軌跡線）」がリアルタイムで描画されます。また、サイドバーの「捜索中の班(分団)」リストで各班のステータスが一覧確認できます。
                </li>
                <li>
                  <strong className="text-white block mb-0.5">② 現場からの伝達メッセージとアラート</strong>
                  団員からテキスト付きの伝達事項が届くと、通常のチャイムとは異なる「ポーン・ポーン」という警告アラート音が鳴り響き、画面の中央に大きくオレンジ色の「新着メッセージポップアップ」が閉じるまで固定表示されます。内容を確認し「確認して閉じる」を押して消去してください。
                </li>
                <li>
                  <strong className="text-white block mb-0.5">③ 指令の送信と強力アラーム</strong>
                  画面下部の送信フォームから、特定の捜索班、あるいは「全員」に向けて指示内容（テキスト最大30文字）を送信できます。指令が送信されると、現場の団員の端末で大音量のサイレン警報音が強制的に鳴り響きます。
                </li>
                <li>
                  <strong className="text-white block mb-0.5">④ 生ログ履歴の監視と最小化</strong>
                  団員から届く極軽量CSV（ID、所属、ステータス、緯度経度、タイムスタンプ、メッセージ）の生ログを監視できます。地図を広く使いたい場合は、履歴ウィンドウの右上「∨ ∧」ボタンで生ログウィンドウを最小化（折りたたみ）してください。
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* 4. 運用上の注意事項 */}
        <section className="bg-gray-900/40 p-6 rounded-2xl border border-gray-850 space-y-5 shadow-lg">
          <h3 className="text-lg font-black text-white border-l-4 border-rescue-500 pl-3 flex items-center gap-2">
            <AlertTriangle size={20} className="text-rescue-500" /> 運用上の注意事項（重要）
          </h3>
          <ul className="list-disc pl-5 text-xs text-gray-400 space-y-3.5 leading-relaxed font-medium">
            <li>
              <strong className="text-white">位置情報の権限設定について：</strong>
              団員のスマートフォンで現在地送信を確実に動作させるために、位置情報のアクセス許可を必ず<strong className="text-rescue-500 font-bold">「常に許可」</strong>または「アプリの使用中のみ許可」に設定してください。また、バックグラウンドでのGPS取得を維持するため、捜索中はブラウザを完全に閉じず、バックグラウンドで起動したままにしておいてください。
            </li>
            <li>
              <strong className="text-white">圏外エリアでの挙動について：</strong>
              電波の届かない山岳部では、送信ボタンや定期連絡のデータは「未送信キュー」としてスマートフォン内部（IndexedDB）に一時保存されます。これは不具合ではなく仕様です。電波が回復（一瞬でも圏内に入った際）した段階で、内部の再送システムが順番に自動アップロードを行います。
            </li>
            <li>
              <strong className="text-white">ブラウザの音響ブロック制限：</strong>
              スマートフォン（特にiOS）のセキュリティ仕様上、起動直後はWebからのアラーム音がブロックされます。アプリ起動後、<strong className="text-white font-bold">「画面のどこかを一度タップ（または入力欄に入力）」</strong>しておくことで制限がアンロックされ、本部からの警告サイレンが正常に鳴るようになります。
            </li>
          </ul>
        </section>

        {/* 5. よくある質問 (FAQ) — 既存の良好な記述を完全維持 */}
        <section className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800 space-y-6 shadow-xl">
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <HelpCircle size={20} className="text-rescue-500" /> よくある質問 (FAQ)
          </h3>
          <div className="space-y-4 text-xs font-medium">
            <div className="space-y-1">
              <h4 className="font-black text-white">Q. iPhoneで本部からの指令アラーム音が鳴りません。</h4>
              <p className="text-gray-400 leading-relaxed">
                A. iOSの仕様により、アプリ起動後に「画面のどこかを1回以上タップ」するまで音の自動再生がブロックされます。アプリ起動後、所属の入力や画面のどこかを一度タップしておくことで、次回から指令受信時に大音量のサイレンが鳴るようになります。
              </p>
            </div>
            
            <div className="space-y-1 border-t border-gray-850 pt-3">
              <h4 className="font-black text-white">Q. iPhoneでバイブが震えないのはなぜですか？</h4>
              <p className="text-gray-400 leading-relaxed">
                A. Apple社のプライバシー保護およびセキュリティ規制により、iOSのWebブラウザ上からはバイブレーションを駆動させることができません。このため、iPhoneではバイブの代わりに「画面が赤黒で激しく点滅する視覚的アラート」が作動します。
              </p>
            </div>

            <div className="space-y-1 border-t border-gray-850 pt-3">
              <h4 className="font-black text-white">Q. 地図を事前にダウンロードする方法は？</h4>
              <p className="text-gray-400 leading-relaxed">
                A. 活動団員画面の「地図」タブを開き、電波のあるオンライン環境下で「大村市地図をダウンロード」ボタンを押します。約1〜2分でダウンロードが完了し、以降はオフライン時でも地図が読み込まれるようになります。
              </p>
            </div>

            <div className="space-y-1 border-t border-gray-850 pt-3">
              <h4 className="font-black text-white">Q. 本部指令画面を現場指揮本部、市役所対策本部、安全対策課、消防署、県央指令室など複数箇所のスマートフォン、タブレット、PCで同時に起動して運用しても大丈夫ですか？</h4>
              <p className="text-gray-405 leading-relaxed">
                A. はい、全く問題ありません。リアルタイム・データベース（Firebase）の同期機能により、何台の本部端末で同時に起動していても、1秒未満の時差ですべての端末の地図、ログ、ポップアップメッセージが完全に同じ状態で同期されます。ただし、新しいメッセージを受信した際はすべての起動端末から同時にアラート警告音が鳴るため、必要に応じて近くの端末は消音（ブラウザミュート）にするなどの調整をしてください。また、それぞれの端末で起動直後に「画面を1回以上タップ」して音声を有効化しておくことを忘れないでください。
              </p>
            </div>
          </div>
        </section>

      </main>

    </div>
  );
}
