# 会計システム

## 誰の、どんな困りごとか
学生サークルの会計幹部およびサークル構成員の集金経費管理時に未払い者への催促の手間や確認漏れなどのトラブルが発生するという困りごと
## コア機能1つ
入金状態の管理/可視化

## 誰が・いくら・なぜ払うか
サークルや少人数の会計の生じるグループの幹部が、月300～500円を、メンバー数上限の増加と、会計記録保存量増加のために支払う。

## 17:15 に見せる操作
サークルの会計をする
# コア機能のオブジェクト/変数定義（仮）
Event: event_id, title, amount, host_id
Member: member_id, name, role
Payment_Status: UNPAID, PENDING, APPROVED

create_event();
select_members();
check_Payments();
list_Partics_Payment();　ホスト確認用のリスト
approve_Payment();　
