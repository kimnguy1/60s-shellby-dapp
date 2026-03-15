# MVP-5: Airdrop Campaign Execution Playbook

## 1. SOP campaign lifecycle

### 1.1 Chuan bi (T-7 den T-1)
- Xac nhan baseline contract/UI tu MVP-2 va MVP-3 (dia chi contract, ABI, commit hash UI, network config).
- Dong bo bo tieu chi eligibility va snapshot window.
- Chay dry-run tren testnet voi 3 nhom tai khoan: du dieu kien, khong du dieu kien, du lieu canh bien.
- Kiem tra luong claim end-to-end: wallet connect -> proof check -> submit tx -> cap nhat trang thai.
- Chot danh sach owner va on-call cho DevOps/Dev/QA/Aptos.

Dau ra bat buoc:
- Baseline release note (contract/UI version + checksum).
- Eligibility dataset freeze v1.
- Go/No-Go checklist da ky xac nhan.

### 1.2 Launch (T0)
- Mo campaign theo cua so thoi gian da cong bo.
- Bat dashboard theo doi KPI realtime.
- Kich hoat kenh incident va phan vai tro commander, triage, comms.
- Xac nhan 10 giao dich claim dau tien thanh cong va ghi log.

Dau ra bat buoc:
- Bien ban launch (thoi diem bat dau, nguoi phe duyet, trang thai).
- Mau thong bao su co va kenh cap nhat cong khai.

### 1.3 Theo doi van hanh (T0 -> Tend)
- Theo doi claim rate, fail tx, time-to-claim theo khung 1h/4h/24h.
- Doi soat chenh lech giua eligibility input va ket qua claim.
- Tuan tra canh bao: spike fail tx, RPC error, wallet incompatibility.
- Cap nhat tinh hinh 2 lan/ngay cho nhom lien quan.

Dau ra bat buoc:
- Daily ops update.
- Incident log (neu co) kem hanh dong khac phuc.

### 1.4 Hau kiem (Tend + 1 -> Tend + 3)
- Chot tong so wallet du dieu kien, da claim, chua claim.
- Phan tich root cause cho tx that bai va diem nghen UX.
- Tong hop chi phi van hanh va de xuat toi uu campaign sau.
- Luu tru artifact (dataset, log, report) vao thu muc luu tru.

Dau ra bat buoc:
- Postmortem campaign.
- Danh sach action item cho vong tiep theo.

## 2. Checklist du lieu eligibility (dau vao/dau ra)

### 2.1 Dau vao
- Snapshot source (block height/time) duoc dinh danh ro rang.
- Danh sach wallet va tieu chi dat dieu kien.
- Rule transform/cleaning (loai bot, wallet duplicate, blacklist).
- Cau hinh phan bo token theo tier/score.
- Proof generation config (neu dung Merkle/proof service).
- Version metadata: creator, timestamp, schema version.

Checklist xac nhan dau vao:
- [ ] Du lieu co schema hop le va khong thieu truong bat buoc.
- [ ] Co checksum/hash cho file snapshot.
- [ ] Co tai lieu mo ta logic eligibility.
- [ ] Co sample test case cho cac truong hop canh bien.

### 2.2 Dau ra
- Eligibility dataset freeze (wallet, allocation, proof/index).
- Danh sach wallet bi loai + ly do.
- Tong hop thong ke: tong wallet, tong allocation, theo tier.
- Audit log bien doi giua cac version dataset.
- Artifact de tich hop UI/API claim.

Checklist xac nhan dau ra:
- [ ] Tong allocation khop voi ngan sach campaign.
- [ ] Khong co wallet duplicate trong dataset cuoi.
- [ ] Mau random 1-5% wallet duoc doi soat chinh xac.
- [ ] File dau ra da duoc ky/kiem hash va luu tru.

## 3. De xuat monitoring KPI dashboard

### KPI chinh
- Claim rate: so wallet da claim / tong wallet du dieu kien.
- Fail tx rate: so giao dich that bai / tong giao dich claim.
- Time-to-claim (P50/P90/P95): thoi gian tu launch den claim thanh cong.

### KPI bo sung
- Throughput claim theo gio.
- So luong wallet gap loi wallet/provider.
- Do tre index/proof service.
- RPC health: error rate, latency.

### Dashboard blocks
- Tong quan campaign: progress, wallet da claim/chua claim.
- Chat luong giao dich: fail tx trend + ma loi pho bien.
- Hieu nang he thong: latency API, RPC, proof lookup.
- Canh bao tu dong: fail tx > nguong, claim rate giam bat thuong.

### Nguong canh bao de xuat
- Fail tx rate > 5% trong 15 phut.
- Time-to-claim P95 tang > 2x baseline.
- Claim rate tang truong < 1%/gio trong 4 gio lien tiep (giai doan dau).

## 4. Incident playbook loi chien dich

### Muc tieu
- Giam MTTR, bao toan du lieu claim, va giao tiep minh bach.

### Phan loai su co
- Sev-1: Khong the claim hoan toan, loi contract nghiem trong, mat toan bo kenh claim.
- Sev-2: Ty le fail tx cao, loi mot phan wallet/provider, cham xu ly lon.
- Sev-3: Loi nho, co workaround, anh huong han che.

### Quy trinh xu ly
1. Phat hien:
- Tu alert he thong hoac bao cao tu nguoi dung.
2. Triage (<= 15 phut):
- Xac dinh muc do anh huong, pham vi, va sev level.
3. Khoanh vung:
- Tam dung tinh nang/rate limit/rollback config neu can.
4. Khac phuc:
- Ap dung fix theo runbook ky thuat (UI/config/infra/contract gate).
5. Xac nhan:
- Theo doi KPI tro lai nguong an toan it nhat 30 phut.
6. Truyen thong:
- Gui cap nhat noi bo va thong bao cong khai (neu anh huong nguoi dung).
7. Post-incident:
- Hoan tat RCA trong 24h voi action item ro owner va due date.

### Vai tro
- Incident Commander (DevOps): dieu phoi chung, ra quyet dinh van hanh.
- Technical Lead (Dev): chan doan va trien khai fix.
- QA Lead: xac nhan hoi phuc va test hoi quy nhanh.
- Aptos Liaison: phoi hop van de mang/chain/tx behavior.
- Communications Owner: cap nhat stakeholder va nguoi dung.

## 5. Ke hoach phoi hop hang ngay (DevOps/Dev/QA/Aptos)

### Daily cadence de xuat
- 09:00 UTC: Standup 15 phut
- 13:00 UTC: Health check 10 phut
- 17:00 UTC: End-of-day review 15 phut

### Noi dung bat buoc moi ngay
- DevOps: tinh trang he thong, canh bao, capacity va risk.
- Dev: backlog loi, patch da release, thay doi can theo doi.
- QA: ket qua regression smoke, bug moi, bug da dong.
- Aptos: tinh trang mang, su kien chain lien quan campaign.

### Co che ban giao va escalation
- Ban giao ca truc bang mau checklist chung (su co mo, owner, ETA).
- Escalate Sev-1 lap tuc den tat ca role trong 5 phut.
- Escalate Sev-2 neu qua 30 phut chua co xu huong giam.
- Tong hop 1 ban daily report gui stakeholder sau buoi 17:00 UTC.
