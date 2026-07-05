import React from 'react';
import { Compass, ShieldCheck, Cpu, WifiOff, FileText, ArrowLeft, Send, AlertOctagon, HelpCircle } from 'lucide-react';

export default function GuideView({ onGoBack }) {
  return (
    <div className="h-[100dvh] w-full bg-gray-950 text-white font-sans overflow-y-auto">
      
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
              <p className="text-[8px] text-rescue-500 font-mono tracking-wider font-bold">USER GUIDE</p>
            </div>
          </div>
          <div className="text-[10px] text-gray-500 font-bold bg-gray-950 px-3 py-1 rounded-full border border-gray-800">
            公式利用者ガイド
          </div>
        </div>
      </header>

      {/* メインビジュアル */}
      <section className="relative bg-gradient-to-b from-gray-900 via-gray-950 to-gray-950 py-16 px-4 border-b border-gray-900">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rescue-500/10 text-rescue-500 text-xs font-black rounded-full border border-rescue-500/20">
            <Cpu size={12} /> 次世代山岳救助支援アプリ
          </span>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
            Search大村市消防団<br />
            <span className="text-2xl md:text-3xl text-gray-300 font-bold">利用者ガイド＆技術解説</span>
          </h2>
          <p className="text-sm md:text-base text-gray-400 max-w-xl mx-auto leading-relaxed">
            本アプリは、電波の極めて微弱な日本の山岳エリアにおいて、消防団員の現在地と安全状況を本部にリアルタイムで伝達するために設計された、超軽量・オフライン対応の山岳捜索システムです。
          </p>
        </div>
      </section>

      {/* メインコンテンツ */}
      <main className="max-w-4xl mx-auto py-12 px-4 space-y-12">
        
        {/* 重要コンセプト（強調事項） */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 特徴1 */}
          <div className="bg-gray-900/60 border border-gray-800 p-6 rounded-2xl space-y-4">
            <div className="w-12 h-12 bg-blue-600/10 border border-blue-500/20 rounded-xl flex items-center justify-center text-blue-400">
              <Cpu size={24} />
            </div>
            <h3 className="text-lg font-black text-white">人工衛星との直接通信を想定</h3>
            <p className="text-xs text-gray-400 leading-relaxed font-medium">
              スターリンクなどの人工衛星とスマートフォン間の直接通信（Direct to Cell）を考慮し、送受信データをわずか**「数十バイトのCSVテキスト1行」**に極限まで圧縮。画像の送受信などを一切排除し、模擬圏外や微弱な電波環境下でも通信エラーを起こさず確実にデータを届けることが可能です。
            </p>
          </div>

          {/* 特徴2 */}
          <div className="bg-gray-900/60 border border-gray-800 p-6 rounded-2xl space-y-4">
            <div className="w-12 h-12 bg-emerald-600/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-lg font-black text-white">個人情報を一切取り扱わない設計</h3>
            <p className="text-xs text-gray-400 leading-relaxed font-medium">
              救助団員のプライバシー保護とセキュリティの観点から、名前の登録・ログイン情報は不要です。活動時には**「任意の設定名（例：大村一郎、1分団 等）」**と**「自動生成される匿名ランダムID」**のみで識別し、住所・電話番号などの個人情報はシステム上で一切取り扱いません。
            </p>
          </div>
        </div>

        {/* 特徴的な機能解説 */}
        <section className="space-y-6">
          <h3 className="text-xl font-black text-white border-l-4 border-rescue-500 pl-3">Search大村市消防団 のコア技術</h3>
          <div className="space-y-4">
            
            <div className="flex items-start gap-4 p-4 bg-gray-900/40 rounded-xl border border-gray-800">
              <div className="p-2 bg-purple-600/10 text-purple-400 rounded-lg shrink-0">
                <WifiOff size={18} />
              </div>
              <div>
                <h4 className="text-sm font-black text-white">IndexedDB 自動再送キュー</h4>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  完全な圏外では、活動ボタンを押したデータは端末内部の保護領域（送信キュー）に即時保存されます。電波が回復した一瞬をアプリが自動で検知し、バックグラウンドで未送信データを自動的に1件ずつ本部へ再送・同期するため、電波を探して送信し直す手間がありません。
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-gray-900/40 rounded-xl border border-gray-800">
              <div className="p-2 bg-yellow-600/10 text-yellow-400 rounded-lg shrink-0">
                <Compass size={18} />
              </div>
              <div>
                <h4 className="text-sm font-black text-white">国土地理院地図の完全キャッシュ</h4>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  大村市の主要山岳エリアのタイル画像データを事前ダウンロードできます。ダウンロードされた地図タイルはアプリ内部にインメモリ化され、完全な電波不通のエリアに入っても、詳細な等高線や登山ルートが描かれた正確な地図をオフラインで表示し続けます。
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-gray-900/40 rounded-xl border border-gray-800">
              <div className="p-2 bg-red-600/10 text-red-400 rounded-lg shrink-0">
                <AlertOctagon size={18} />
              </div>
              <div>
                <h4 className="text-sm font-black text-white">強力な緊急通知システム</h4>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  本部のパソコンやタブレットから特定の団員、または全員に向けて「避難命令」などの指令が送られると、ブラウザの音響API（Web Audio API）から自動で大音量サイレン警告音を合成生成し、同時に画面が赤く点滅して危険を通知します。
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* 各画面の操作説明 */}
        <section className="space-y-6">
          <h3 className="text-xl font-black text-white border-l-4 border-rescue-500 pl-3">画面の操作方法</h3>
          
          <div className="space-y-8">
            {/* 1. ポータル画面 */}
            <div className="bg-gray-900/30 p-6 rounded-2xl border border-gray-800/80 space-y-4">
              <span className="text-xs font-black text-rescue-500 uppercase tracking-widest block">起動ポータル</span>
              <h4 className="text-base font-black text-white">1. 利用画面の選択</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                アプリを立ち上げると、最初に画面選択パネルが表示されます。個々の団員のスマートフォンで使用する場合は**「活動団員 画面」**、本部の指令室PCや指揮車内のタブレットで使用する場合は**「本部指令 画面」**をタップして進んでください。ヘッダーの「戻る（矢印）」ボタンでいつでもこの選択画面に戻ることができます。
              </p>
            </div>

            {/* 2. 団員用画面 */}
            <div className="bg-gray-900/30 p-6 rounded-2xl border border-gray-800/80 space-y-4">
              <span className="text-xs font-black text-blue-400 uppercase tracking-widest block">団員用端末</span>
              <h4 className="text-base font-black text-white">2. 活動団員の操作</h4>
              <ul className="list-decimal pl-4 text-xs text-gray-400 space-y-2.5 leading-relaxed">
                <li>
                  <strong className="text-white">名前の入力：</strong> 画面上部の入力欄に名前（例：分団名や団員名）を入力します。情報は端末に自動保存されます。
                </li>
                <li>
                  <strong className="text-white">活動状況の送信：</strong> 画面中央の「捜索中」「異状なし」「救助要請」などの巨大ボタンを1つタップするだけで、その瞬間のGPS位置情報と現在のステータスがセットで即時送信（またはキューイング）されます。
                </li>
                <li>
                  <strong className="text-white">オフライン地図：</strong> 「地図」タブに切り替え、「地図をダウンロード」ボタンを事前に押しておくことで、大村市山岳の等高線マップが一括キャッシュされ、電波のない山中でも自分の現在地を確認できます。
                </li>
              </ul>
            </div>

            {/* 3. 本部画面 */}
            <div className="bg-gray-900/30 p-6 rounded-2xl border border-gray-800/80 space-y-4">
              <span className="text-xs font-black text-emerald-400 uppercase tracking-widest block">本部指令システム</span>
              <h4 className="text-base font-black text-white">3. 本部での操作</h4>
              <ul className="list-decimal pl-4 text-xs text-gray-400 space-y-2.5 leading-relaxed">
                <li>
                  <strong className="text-white">団員のリアルタイム追跡：</strong> 地図上にすべての稼働中団員の「現在地（赤い名前ラベル）」と「これまでの捜索軌跡（赤い移動経路）」がリアルタイムで描画されます。下山開始した団員や、30分以上同期のない団員は自動的に地図とリストから除外され、現在の実働団員のみが表示されます。
                </li>
                <li>
                  <strong className="text-white">指令の送信：</strong> 送信フォームから、特定の団員または「全員」を選択し、指示内容を打ち込んで送信できます。送信すると、団員のスマートフォンに即時届き、強制的にサイレン音による警報が鳴り響きます。
                </li>
                <li>
                  <strong className="text-white">CSV生ログ監視：</strong> 団員から届いた極軽量CSVデータ（名前、ステータス、緯度経度、時間）の生ログ履歴が最新順に表示されます。
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* よくある質問 */}
        <section className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800 space-y-6">
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <HelpCircle size={20} className="text-rescue-500" /> よくある質問 (FAQ)
          </h3>
          <div className="space-y-4 text-xs">
            <div className="space-y-1">
              <h4 className="font-black text-white">Q. iPhoneで本部からの指令アラーム音が鳴りません。</h4>
              <p className="text-gray-400 leading-relaxed">
                A. iOSの仕様により、アプリ起動後に「画面のどこかを1回以上タップ」するまで音の自動再生がブロックされます。アプリ起動後、名前の入力や画面のどこかを一度タップしておくことで、次回から指令受信時に大音量のサイレンが鳴るようになります。
              </p>
            </div>
            <div className="space-y-1 border-t border-gray-800 pt-3">
              <h4 className="font-black text-white">Q. iPhoneでバイブが震えないのはなぜですか？</h4>
              <p className="text-gray-400 leading-relaxed">
                A. Apple社のプライバシー保護およびセキュリティ規制により、iOSのWebブラウザ上からはバイブレーションを駆動させることができません。このため、iPhoneではバイブの代わりに「画面が赤黒で激しく点滅する視覚的アラート」が作動します。
              </p>
            </div>
            <div className="space-y-1 border-t border-gray-800 pt-3">
              <h4 className="font-black text-white">Q. 地図を事前にダウンロードする方法は？</h4>
              <p className="text-gray-400 leading-relaxed">
                A. 活動団員画面の「地図」タブを開き、電波のあるオンライン環境下で「大村市地図をダウンロード」ボタンを押します。約1〜2分でダウンロードが完了し、以降はオフライン時でも地図が読み込まれるようになります。
              </p>
            </div>
          </div>
        </section>

      </main>

      {/* フッター (著作権表示: 白文字・詳細表記) */}
      <footer className="border-t border-gray-900 bg-gray-950 py-12 px-6 text-center select-text">
        <div className="max-w-xl mx-auto space-y-3 text-white font-bold">
          <p className="text-xs">Copyright&copy;2026　大村市消防団　田中哲也. All rights reserved</p>
          <p className="text-[10px] leading-relaxed opacity-90">
            本アプリおよび本マニュアルに関する一切の権利（著作権を含む）は、開発者（大村市消防団　田中哲也）に帰属します。無断での複製、転載、再配布を禁じます。
          </p>
        </div>
      </footer>

    </div>
  );
}
