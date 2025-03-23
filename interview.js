const APIkey = ""; //GEMINI API KEY 입력

const FS = FileStream;

const path = "/sdcard/hj/"; //파일 저장할 디렉토리 설정

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

    resGem = "[" + resGem.split("[")[1].split("]")[0] + "]"; //응답 메시지 전처리 - 배열 형식으로 만들기

    resGem = resGem.replace(/\n/g, "").replace(/\\/g, ""); //응답 메시지 전처리

    let length = JSON.parse(resGem).length; //면접 질문 개수 구하기

    Api.replyRoom(room, "총 " + length + "개의 면접 질문 준비 완료됨");

    FS.write(path + sender + ".txt", JSON.stringify(JSON.parse(resGem))); //면접 질문 저장

    FS.write(path + sender + "-leng.txt", JSON.stringify("0")); //면접 시작, 면접 질문 순서 저장(0번쨰)

    let q = progress(sender, "0"); //0번째 질문 던지기

    //기록 q:질문 a:답변
    let record = {
      0: {
        q: q,

        a: "",
      },
    };

    FS.write(path + sender + "-record.txt", JSON.stringify(record)); //기록 저장

    Api.replyRoom(room, "1. " + q);
  }

  let order = Number(JSON.parse(FS.read(path + sender + "-leng.txt"))); //이 메시지를 보낸 사람의 질문 순서 확인

  let list = JSON.parse(FS.read(path + sender + ".txt")); //이 메시지 보낸 사람 면접 질문 배열 가져오기

  //만약 면접 질문 개수와 현재 면접 순서가 같다면
  if (list.length == order + 1) {
    Api.replyRoom(
      room,
      "면접이 완료되었습니다 면접에 응해주셔서 감사합니다\n결과는 추후에 공지하겠습니다 앞으로의 과정에서도 좋은 결과 있으시길 바랍니다."
    );

    FS.write(path + sender + "-leng.txt", JSON.stringify("-1")); //면접 순서에 -1(면접중이 아님) 반환

    let record = JSON.parse(FS.read(path + sender + "-record.txt")); //기록 가져오기

    record[String(order)]["a"] = msg;

    FS.write(path + sender + "-record.txt", JSON.stringify(record)); //기록
  }

  //만약 면접중이고, 0~3번째 글자가 '/면접 '이고, 면접 질문 개수와 현재 면접 순서가 같다면
  if (order != -1 && msg.substr(0, 3) != "/면접" && list.length != order + 1) {
    let record = JSON.parse(FS.read(path + sender + "-record.txt")); //기록 가져오기

    record[String(order)]["a"] = msg; //답변 저장

    FS.write(path + sender + "-record.txt", JSON.stringify(record)); //기록

    FS.write(path + sender + "-leng.txt", JSON.stringify(order + 1)); //순서 기록

    order = order + 1; //순서에 1 추가

    let q = progress(sender, order); //다음 질문 받아오기

    record[order] = {
      q: q,

      a: "",
    };

    FS.write(path + sender + "-record.txt", JSON.stringify(record)); //기록

    order = order + 1; //순서에 1 더해줌(실제 보여지는 순서는 order보다 1만큼 크기 때문

    Api.replyRoom(room, order + ". " + q); //질문 때리기

    let list = JSON.parse(FS.read(path + sender + ".txt"));
  }

  if (msg == "/기록") {
    let record = JSON.parse(FS.read(path + sender + "-record.txt")); //기록 가져오기

    let arr = []; //빈 배열 생성

    //기록 정리
    for (let i in record) {
      let order = Number(i) + 1;

      arr.push(order + ". " + record[i]["q"]);

      arr.push("답변 : " + record[i]["a"]);

      arr.push(" ");
    }

    replier.reply(arr.join("\n")); //답변
  }

  if (msg.startsWith("/평가 ")) {
    let sentence = Number(msg.substr(4)) - 1; //문항 번호 가져오기

    let record = JSON.parse(FS.read(path + sender + "-record.txt")); //기록 가져오기

    let q = record[sentence]["q"]; //질문 대입

    let a = record[sentence]["a"]; //답변 대입

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
/** GEMINI에게 요청 보내는 함수 */
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

/**
 * 해당 면접자에게 번호에 알맞은 질문 내뱉기
 * @param sender1 면접자 이름
 * @param order 문항 번호
 */
function progress(sender1, order) {
  let o = Number(order); //숫자로 변환

  let list = JSON.parse(FS.read(path + sender1 + ".txt"));

  let q = list[o];

  return q;
}
