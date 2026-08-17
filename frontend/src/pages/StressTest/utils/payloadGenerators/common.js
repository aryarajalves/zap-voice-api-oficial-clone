export function getFakeContactData(index) {
    const i = index + 1;
    const ddd = '11';
    const phoneNum = `9${String(90000 + i).padStart(8, '0')}`;
    const phone = `+55${ddd}${phoneNum}`;
    const email = `teste.contato${i}@example.com`;
    const name = `Contato Teste ${i}`;
    const ts = Math.floor(Date.now() / 1000);

    return { i, ddd, phoneNum, phone, email, name, ts };
}
