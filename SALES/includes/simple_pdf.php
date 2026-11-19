<?php
/**
 * Tiny dependency-free PDF writer (A4, Helvetica, text + lines + rectangles).
 * Enough for printable business documents; no Composer/FPDF needed on XAMPP.
 */
class SimplePDF {
    private array $ops = [];
    private float $w = 595.28, $h = 841.89;

    private function esc(string $t): string {
        // Standard PDF fonts are WinAnsi: convert UTF-8 and replace the peso sign.
        $t = str_replace('₱', 'PHP ', $t);
        $t = @iconv('UTF-8', 'windows-1252//TRANSLIT//IGNORE', $t) ?: $t;
        return str_replace(['\\', '(', ')', "\r"], ['\\\\', '\\(', '\\)', ''], $t);
    }
    private function y(float $y): float { return $this->h - $y; }   // top-left origin helper

    public function text(float $x, float $y, string $t, float $size = 10, bool $bold = false, ?array $rgb = null): void {
        $font = $bold ? 'F2' : 'F1';
        $c = $rgb ? sprintf('%.3F %.3F %.3F rg ', $rgb[0], $rgb[1], $rgb[2]) : '0 g ';
        $this->ops[] = sprintf('BT %s/%s %.1F Tf %.2F %.2F Td (%s) Tj ET', $c, $font, $size, $x, $this->y($y), $this->esc($t));
    }
    public function textRight(float $xRight, float $y, string $t, float $size = 10, bool $bold = false): void {
        $approx = strlen($t) * $size * ($bold ? 0.56 : 0.52);
        $this->text($xRight - $approx, $y, $t, $size, $bold);
    }
    public function line(float $x1, float $y1, float $x2, float $y2, float $width = 0.6): void {
        $this->ops[] = sprintf('%.2F w %.2F %.2F m %.2F %.2F l S', $width, $x1, $this->y($y1), $x2, $this->y($y2));
    }
    public function rect(float $x, float $y, float $w, float $h, array $fill): void {
        $this->ops[] = sprintf('%.3F %.3F %.3F rg %.2F %.2F %.2F %.2F re f 0 g', $fill[0], $fill[1], $fill[2], $x, $this->y($y + $h), $w, $h);
    }

    public function output(): string {
        $stream = implode("\n", $this->ops);
        $objs = [];
        $objs[1] = '<< /Type /Catalog /Pages 2 0 R >>';
        $objs[2] = '<< /Type /Pages /Kids [3 0 R] /Count 1 >>';
        $objs[3] = sprintf('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 %.2F %.2F] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>', $this->w, $this->h);
        $objs[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
        $objs[5] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
        $objs[6] = "<< /Length " . strlen($stream) . " >>\nstream\n" . $stream . "\nendstream";

        $pdf = "%PDF-1.4\n";
        $offsets = [];
        foreach ($objs as $n => $body) {
            $offsets[$n] = strlen($pdf);
            $pdf .= "{$n} 0 obj\n{$body}\nendobj\n";
        }
        $xref = strlen($pdf);
        $pdf .= "xref\n0 " . (count($objs) + 1) . "\n0000000000 65535 f \n";
        foreach ($offsets as $off) $pdf .= sprintf("%010d 00000 n \n", $off);
        $pdf .= "trailer\n<< /Size " . (count($objs) + 1) . " /Root 1 0 R >>\nstartxref\n{$xref}\n%%EOF";
        return $pdf;
    }
}
