# 会計システム

## 誰の、どんな困りごとか
サークルの幹部や幹事が、イベントごとに複数ツールを横断して管理するのが大変

## コア機能1つ
イベントごとのメンバーの入金確認。

## 誰が・いくら・なぜ払うか
誰が：サークル等の団体
いくら：月300~500円
なぜ払うのか：メンバー数が多くなった際の手動管理の限界を解消し、CSVデータ出力や年度末の引継ぎ作業をスムーズに行って集金業務の労力/時間削減をするため

## 17:15 に見せる操作
ホストのイベント立ち上げ
メンバーの入金チェック
入金状態のリスト表示

# コア機能のオブジェクト/変数定義（仮）
Event: event_id, title, amount, host_id
Member: member_id, name, role
Payment_Status: UNPAID, PENDING, APPROVED

create_event();
select_members();
check_Payments();
list_Partics_Payment();　ホスト確認用のリスト
approve_Payment();　
