# 会計システム

## 誰の、どんな困りごとか

## コア機能1つ
入金状態の管理/可視化

## 誰が・いくら・なぜ払うか

## 17:15 に見せる操作

# コア機能のオブジェクト/変数定義（仮）
Event: event_id, title, amount, host_id
Member: member_id, name, role
Payment_Status: UNPAID, PENDING, APPROVED

create_event();
select_members();
check_Payments();
list_Partics_Payment();　ホスト確認用のリスト
approve_Payment();　
