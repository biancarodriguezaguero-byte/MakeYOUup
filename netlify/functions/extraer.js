exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { textoPDF } = JSON.parse(event.body);

    if (!textoPDF || textoPDF.trim().length < 20) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "El texto del PDF está vacío o es demasiado corto." }),
      };
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 4000,
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content: `Sos un asistente experto en catálogos de maquillaje. Extraé todos los productos y devolvé SOLO un JSON puro, sin markdown ni explicaciones. Array con objetos: nombre (string), tipo (string), color (string o null), precio (number).`,
          },
          {
            role: "user",
            content: `Extraé todos los productos de este catálogo:\n\n${textoPDF}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || `OpenAI error ${response.status}`);
    }

    const data = await response.json();
    let texto = data.choices[0].message.content.trim();
    texto = texto.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();

    const productos = JSON.parse(texto);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productos }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
