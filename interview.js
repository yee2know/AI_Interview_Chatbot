const APIkey = "";

const FS = FileStream;

const path = "/sdcard/hj/";

function response(
  room,
  msg,
  sender,
  isGroupChat,
  replier,
  imageDB,
  packageName
) {
  if (msg.substr(0, 3) == "/면접") {
    var question = msg.substring(4);

    let resGem = getGPTResponse(
      '내가 학교 생활기록부를 아래에 제시할게 너는 그에 맞춰 면접 질문을 아래 조건에 맞춰 제시해줘 1.말투는 교양있는 말투로 해야해 2.면접 질문은 제시될 학교생활기록부를 토대로 질문해야해 단 그것을 토대로 심화해서 질문하는경우는 괜찮아 3. 면접 질문들은 자바스크립트 배열의 형태를 JSON형태로 제공해줘 예를 들면 ["~~의 동기는 무엇인가요?","~~를 한 이유는 무엇인가요?"] 이런식이야 답변엔 배열을 말고는 다른 내용을 포함하지 마 다음 줄부터 학교생활기록부의 내용이야:' +
        question
    );

    resGem = "[" + resGem.split("[")[1].split("]")[0] + "]";

    resGem = resGem.replace(/\n/g, "").replace(/\\/g, "");

    let length = JSON.parse(resGem).length;

    Api.replyRoom(room, "총 " + length + "개의 면접 질문 준비 완료됨");

    FS.write(path + sender + ".txt", JSON.stringify(JSON.parse(resGem)));

    FS.write(path + sender + "-leng.txt", JSON.stringify("0"));

    let q = progress(sender, "0");

    let record = {
      0: {
        q: q,

        a: "",
      },
    };

    FS.write(path + sender + "-record.txt", JSON.stringify(record));

    Api.replyRoom(room, "1. " + q);
  }

  let order = Number(JSON.parse(FS.read(path + sender + "-leng.txt")));

  let list = JSON.parse(FS.read(path + sender + ".txt"));

  if (list.length == order + 1) {
    Api.replyRoom(
      room,
      "면접이 완료되었습니다 면접에 응해주셔서 감사합니다\n결과는 추후에 공지하겠습니다 앞으로의 과정에서도 좋은 결과 있으시길 바랍니다."
    );

    FS.write(path + sender + "-leng.txt", JSON.stringify("-1"));

    let record = JSON.parse(FS.read(path + sender + "-record.txt"));

    record[String(order)]["a"] = msg;

    FS.write(path + sender + "-record.txt", JSON.stringify(record));
  }

  if (order != -1 && msg.substr(0, 3) != "/면접" && list.length != order + 1) {
    let record = JSON.parse(FS.read(path + sender + "-record.txt"));

    record[String(order)]["a"] = msg;

    FS.write(path + sender + "-record.txt", JSON.stringify(record));

    FS.write(path + sender + "-leng.txt", JSON.stringify(order + 1));

    order = order + 1;

    let q = progress(sender, order);

    record[order] = {
      q: q,

      a: "",
    };

    FS.write(path + sender + "-record.txt", JSON.stringify(record));

    order = order + 1;

    Api.replyRoom(room, order + ". " + q);

    let list = JSON.parse(FS.read(path + sender + ".txt"));
  }

  if (msg == "/기록") {
    let record = JSON.parse(FS.read(path + sender + "-record.txt"));

    let arr = [];

    for (let i in record) {
      let order = Number(i) + 1;

      arr.push(order + ". " + record[i]["q"]);

      arr.push("답변 : " + record[i]["a"]);

      arr.push(" ");
    }

    replier.reply(arr.join("\n"));
  }

  if (msg.startsWith("/평가 ")) {
    let sentence = Number(msg.substr(4)) - 1;

    let record = JSON.parse(FS.read(path + sender + "-record.txt"));

    let q = record[sentence]["q"];

    let a = record[sentence]["a"];

    var resGem = getGPTResponse(
      "면접에 대한 질문과 답변인데 답변에 대한 평가를 해줘 질문은 " +
        q +
        "이고 그에 대한 답변은 " +
        a +
        "야"
    );

    Api.replyRoom(room, resGem);
  }
}

function getGPTResponse(msg) {
  let json;

  let result;

  try {
    let response = org.jsoup.Jsoup.connect(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" +
        APIkey
    )

      .header("Content-Type", "application/json")
      .requestBody(JSON.stringify({ contents: [{ parts: [{ text: msg }] }] }))
      .method(org.jsoup.Connection.Method.POST)
      .ignoreContentType(true)
      .ignoreHttpErrors(true)
      .timeout(200000)
      .post();

    json = JSON.parse(response.text());

    result = json.candidates[0].content.parts[0].text;
  } catch (e) {
    result = e;

    Log.e(e);
  }

  return result;
}

function progress(sender1, order) {
  let o = Number(order);

  let list = JSON.parse(FS.read(path + sender1 + ".txt"));

  let q = list[o];

  return q;
}
