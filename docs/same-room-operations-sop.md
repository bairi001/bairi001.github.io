# 2名同室リクエスト 運用SOP

更新基線：2026-10-04 JST  
対象：身悠晏 Web予約台帳 / Booking Status v5

## 1. 目的

2名同室の希望を「予約申請」と「確定」に分け、部屋・スタッフ・時間の確認前に同室確定と誤認させない。

## 2. 現行ステータス

### booking_status

- `requested`：予約申請を受信。まだ店舗確定ではない
- `confirmed`：店舗とお客様の双方で日時・コースが確定
- `cancelled`：予約不成立・キャンセル
- `arrived`：実際に来店
- `no_show`：確定予約に来店なし

### same_room_status

- `not_requested`：同室希望なし
- `pending`：同室希望あり、店舗確認中
- `confirmed`：同室で案内できることを店舗が確認
- `unavailable`：希望条件では同室不可
- `alternative_agreed`：別室・別時間など代替案をお客様が了承

## 3. 受付時

Web予約で `same_room_requested = TRUE` になるのは2名予約のみ。  
新規受付時は以下を初期値とする。

| 条件 | booking_status | same_room_status |
| --- | --- | --- |
| 2名・同室希望あり | requested | pending |
| 同室希望なし | requested | not_requested |

同室希望があるだけで `confirmed` にしない。

## 4. 店舗確認

同室希望を受けたら、次の3点を同時に確認する。

1. 希望時間に2名分の担当スタッフを確保できるか
2. 希望コースを同時開始できるか
3. 同室で使用できる部屋・ベッド構成を確保できるか

3点すべて確保できる場合：

- `same_room_status = confirmed`
- 日時・コースも確定した時点で `booking_status = confirmed`
- 必要なら確認メール/LINE/WhatsAppに「2名同室で確定」と明記

## 5. 同室が難しい場合

希望条件では同室不可の場合：

1. まず `same_room_status = unavailable`
2. 次のいずれかを提案
   - 同じ時間・別室
   - 少し時間をずらして同室
   - 別の開始時間で同室
   - コース変更で同時開始
3. お客様が代替案を了承したら `same_room_status = alternative_agreed`
4. 代替日時・コースも双方合意した時点で `booking_status = confirmed`
5. 代替案を断られ予約不成立なら `booking_status = cancelled`

`alternative_agreed` を使う場合、Booking_Status_Log の note または店舗メモに「何を変更して合意したか」を残す。

## 6. 時間変更

開始時間が変わった場合は、元の希望時間を上書きするだけでなく Booking Status v5 の変更履歴を残す。

- `scheduled_at_jst`：確定した新しい開始時間
- `reschedule_count`：変更回数
- `last_rescheduled_at_jst`：最終変更時刻

「お客様が候補時間に Yes と返した」だけで、店舗側の在庫がその後変わっている場合は即 `confirmed` としない。店舗側の最終確認まで `requested` を維持する。

## 7. 来店後

実際の来店を確認してから：

- `booking_status = arrived`
- `final_amount_yen` に実際の最終会計額を入力

メニュー定価や事前見積額を自動で `final_amount_yen` に入れない。  
確定予約に来店がなければ、確認後に `booking_status = no_show`。

## 8. 返信テンプレートの意味

### pending

「同室希望を受け付けました。お部屋と2名分のスタッフを確認後、店舗からの返信で可否をお知らせします。」

これは予約確定でも同室確定でもない。

### confirmed

「○月○日 ○:○○、2名様、同室でご予約を承りました。」

この表現は、日時と同室の両方を実際に確保した場合のみ使用する。

### unavailable / alternative

「ご希望時間は同室でのご案内が難しいため、①同時間で別室、②○:○○から同室、のどちらかでしたらご案内できます。」

お客様の返答後、合意内容に合わせてステータスを更新する。

## 9. 日次チェック

営業終了後または翌営業開始時に、前日までの以下を確認する。

- 過去日時なのに `requested` のまま
- `pending` のまま過去日時になった同室希望
- `confirmed` だが `arrived / no_show / cancelled` に未更新
- `arrived` だが `final_amount_yen` が空欄

時間経過だけで自動変更はせず、メール・LINE・電話・店頭記録などの根拠を確認して更新する。

## 10. 分析口径

同室関連は少なくとも以下を分けて集計する。

- same_room_requested
- same_room_confirmed
- alternative_agreed
- unavailable
- 同室希望から予約確定に至った件数
- 同室希望後に cancelled となった件数

`same_room_status` と `booking_status` は別軸であり、互いの代理指標として扱わない。
