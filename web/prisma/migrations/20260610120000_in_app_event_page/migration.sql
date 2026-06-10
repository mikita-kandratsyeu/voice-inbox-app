-- CreateTable
CREATE TABLE "InAppEventPage" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "ctaLabel" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InAppEventPage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InAppEventPage_eventId_locale_key" ON "InAppEventPage"("eventId", "locale");

-- CreateIndex
CREATE INDEX "InAppEventPage_eventId_published_idx" ON "InAppEventPage"("eventId", "published");

-- RLS (same pattern as other public tables)
ALTER TABLE "InAppEventPage" ENABLE ROW LEVEL SECURITY;

-- Seed: update_1-1-0 (migrated from mobile i18n inAppEvent.update110)
INSERT INTO "InAppEventPage" (
    "id",
    "eventId",
    "locale",
    "title",
    "contentType",
    "body",
    "ctaLabel",
    "published",
    "revision",
    "createdAt",
    "updatedAt"
) VALUES
(
    'clseed_inappevent_update110_en',
    'update_1-1-0',
    'en',
    'Voice Inbox AI 1.2.0',
    'html',
    '<p class="badge">What''s new</p>
<h1 class="app-name">Voice Inbox AI</h1>
<p class="version">1.2.0</p>
<p class="tagline">More powerful AI, richer export, and an inbox that fits your style.</p>
<ul class="features">
<li><strong>Advanced AI models</strong> <span class="pro">Pro</span><br/>Choose stronger models for summaries, Q&amp;A, and organization when you need more depth.</li>
<li><strong>Extended export &amp; batch</strong> <span class="pro">Pro</span><br/>Email summaries, batch-export multiple notes, and share audio when you need files elsewhere.</li>
<li><strong>Custom folder colors</strong> <span class="pro">Pro</span><br/>Color-code folders so your inbox stays scannable at a glance.</li>
<li><strong>Accent color</strong> <span class="pro">Pro</span><br/>Match buttons and progress accents to your style across the app.</li>
<li><strong>AI organize notes</strong><br/>Let AI suggest folders and sort notes—review everything before you apply.</li>
<li><strong>Polish &amp; stability</strong><br/>Fixes and refinements across the app for a smoother everyday experience.</li>
</ul>',
    'Continue',
    true,
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'clseed_inappevent_update110_ru',
    'update_1-1-0',
    'ru',
    'Voice Inbox AI 1.2.0',
    'html',
    '<p class="badge">Что нового</p>
<h1 class="app-name">Voice Inbox AI</h1>
<p class="version">1.2.0</p>
<p class="tagline">Мощнее ИИ, удобнее экспорт и инбокс в вашем стиле.</p>
<ul class="features">
<li><strong>Продвинутые ИИ-модели</strong> <span class="pro">Pro</span><br/>Выбирайте более сильные модели для итогов, вопросов к заметке и организации, когда нужна глубина.</li>
<li><strong>Расширенный экспорт и пакетная выгрузка</strong> <span class="pro">Pro</span><br/>Отправляйте итоги на email, выгружайте несколько заметок сразу и делитесь аудио, когда нужны файлы снаружи.</li>
<li><strong>Цвета папок</strong> <span class="pro">Pro</span><br/>Размечайте папки цветом — инбокс проще сканировать одним взглядом.</li>
<li><strong>Акцентный цвет</strong> <span class="pro">Pro</span><br/>Настройте цвет кнопок и прогресса под себя во всём приложении.</li>
<li><strong>ИИ-организация заметок</strong><br/>ИИ предложит папки и разложит заметки — вы проверите всё перед применением.</li>
<li><strong>Стабильность и мелочи</strong><br/>Исправления и полировка по всему приложению для спокойной ежедневной работы.</li>
</ul>',
    'Продолжить',
    true,
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
