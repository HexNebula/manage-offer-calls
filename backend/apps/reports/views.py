import io
from django.utils import timezone
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable
)
from reportlab.lib.enums import TA_CENTER

from apps.authentication.permissions import IsAnalystOrAbove
from apps.offers.models import OfferCall
from apps.candidates.models import Submission


def _build_styles():
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'ReportTitle',
        parent=styles['Title'],
        fontSize=18,
        spaceAfter=6,
        alignment=TA_CENTER,
    )
    subtitle_style = ParagraphStyle(
        'ReportSubtitle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.grey,
        alignment=TA_CENTER,
        spaceAfter=12,
    )
    section_header_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontSize=13,
        spaceBefore=12,
        spaceAfter=6,
        textColor=colors.HexColor('#1a1a2e'),
    )
    body_style = ParagraphStyle(
        'BodyText',
        parent=styles['Normal'],
        fontSize=9,
        leading=14,
    )
    return {
        'title': title_style,
        'subtitle': subtitle_style,
        'section': section_header_style,
        'body': body_style,
        'normal': styles['Normal'],
    }


STATUS_COLORS = {
    'DRAFT': colors.HexColor('#6c757d'),
    'PUBLISHED': colors.HexColor('#0d6efd'),
    'EVALUATION': colors.HexColor('#fd7e14'),
    'AWARDED': colors.HexColor('#198754'),
    'CANCELLED': colors.HexColor('#dc3545'),
}

SUBMISSION_STATUS_COLORS = {
    'RECEIVED': colors.HexColor('#0d6efd'),
    'UNDER_REVIEW': colors.HexColor('#fd7e14'),
    'ACCEPTED': colors.HexColor('#198754'),
    'REJECTED': colors.HexColor('#dc3545'),
}


class OfferListReportView(APIView):
    permission_classes = [IsAnalystOrAbove]

    def get(self, request):
        offers = OfferCall.objects.select_related('created_by', 'assigned_to').all().order_by('-created_at')

        status_filter = request.query_params.get('status')
        if status_filter:
            offers = offers.filter(status=status_filter)

        category_filter = request.query_params.get('category')
        if category_filter:
            offers = offers.filter(category=category_filter)

        from apps.audit.models import AuditLog
        AuditLog.objects.create(
            user=request.user,
            action='EXPORT',
            resource_type='OfferCall',
            resource_id='LIST',
            changes={'filters': {'status': status_filter, 'category': category_filter}},
            ip_address=self._get_ip(request),
        )

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=15 * mm,
            leftMargin=15 * mm,
            topMargin=20 * mm,
            bottomMargin=20 * mm,
        )

        styles = _build_styles()
        elements = []

        elements.append(Paragraph('Appels d\'Offres — Liste des Dossiers', styles['title']))
        elements.append(Paragraph(
            f'Generated on {timezone.now().strftime("%Y-%m-%d %H:%M UTC")} by {request.user.full_name}',
            styles['subtitle']
        ))
        elements.append(HRFlowable(width='100%', thickness=1, color=colors.HexColor('#dee2e6'), spaceAfter=12))

        status_counts = {}
        for offer in offers:
            status_counts[offer.status] = status_counts.get(offer.status, 0) + 1

        summary_data = [['Status', 'Count']]
        for s, count in sorted(status_counts.items()):
            summary_data.append([s, str(count)])
        summary_data.append(['TOTAL', str(offers.count())])

        summary_table = Table(summary_data, colWidths=[60 * mm, 30 * mm])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a1a2e')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (1, 0), (1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#dee2e6')),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#f8f9fa')),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, colors.HexColor('#f8f9fa')]),
        ]))
        elements.append(Paragraph('Status Summary', styles['section']))
        elements.append(summary_table)
        elements.append(Spacer(1, 12))

        elements.append(Paragraph('Offer Calls', styles['section']))

        table_data = [['Reference', 'Title', 'Status', 'Category', 'Budget', 'Deadline', 'Assigned To']]
        for offer in offers:
            budget = f'{offer.budget_estimate:,.2f}' if offer.budget_estimate else 'N/A'
            deadline = offer.submission_deadline.strftime('%Y-%m-%d') if offer.submission_deadline else 'N/A'
            assigned = offer.assigned_to.full_name if offer.assigned_to else 'Unassigned'
            table_data.append([
                offer.reference_number,
                offer.title[:40] + '...' if len(offer.title) > 40 else offer.title,
                offer.status,
                offer.get_category_display(),
                budget,
                deadline,
                assigned,
            ])

        col_widths = [30 * mm, 50 * mm, 25 * mm, 30 * mm, 25 * mm, 25 * mm, 35 * mm]
        main_table = Table(table_data, colWidths=col_widths, repeatRows=1)
        main_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a1a2e')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#dee2e6')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8f9fa')]),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('WORDWRAP', (0, 0), (-1, -1), True),
        ]))
        elements.append(main_table)

        doc.build(elements)
        buffer.seek(0)

        response = HttpResponse(buffer.read(), content_type='application/pdf')
        response['Content-Disposition'] = (
            f'attachment; filename="offers_report_{timezone.now().strftime("%Y%m%d_%H%M%S")}.pdf"'
        )
        return response

    def _get_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')


class OfferDetailReportView(APIView):
    permission_classes = [IsAnalystOrAbove]

    def get(self, request, pk):
        try:
            offer = OfferCall.objects.select_related('created_by', 'assigned_to').get(pk=pk)
        except OfferCall.DoesNotExist:
            return Response({'error': 'Offer not found.'}, status=status.HTTP_404_NOT_FOUND)

        submissions = Submission.objects.filter(offer_call=offer).select_related(
            'candidate', 'evaluated_by'
        ).order_by('-technical_score')

        from apps.audit.models import AuditLog
        AuditLog.objects.create(
            user=request.user,
            action='EXPORT',
            resource_type='OfferCall',
            resource_id=str(offer.id),
            changes={'reference': offer.reference_number},
            ip_address=self._get_ip(request),
        )

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=15 * mm,
            leftMargin=15 * mm,
            topMargin=20 * mm,
            bottomMargin=20 * mm,
        )

        styles = _build_styles()
        elements = []

        elements.append(Paragraph(f'Offer Call Report: {offer.reference_number}', styles['title']))
        elements.append(Paragraph(
            f'Generated on {timezone.now().strftime("%Y-%m-%d %H:%M UTC")} by {request.user.full_name}',
            styles['subtitle']
        ))
        elements.append(HRFlowable(width='100%', thickness=1, color=colors.HexColor('#dee2e6'), spaceAfter=8))

        elements.append(Paragraph('Offer Details', styles['section']))
        details_data = [
            ['Reference', offer.reference_number],
            ['Title', offer.title],
            ['Status', offer.get_status_display()],
            ['Category', offer.get_category_display()],
            ['Budget Estimate', f'{offer.budget_estimate:,.2f}' if offer.budget_estimate else 'N/A'],
            ['Published At', offer.published_at.strftime('%Y-%m-%d %H:%M UTC') if offer.published_at else 'N/A'],
            ['Submission Deadline',
             offer.submission_deadline.strftime('%Y-%m-%d %H:%M UTC') if offer.submission_deadline else 'N/A'],
            ['Evaluation Deadline',
             offer.evaluation_deadline.strftime('%Y-%m-%d %H:%M UTC') if offer.evaluation_deadline else 'N/A'],
            ['Created By', offer.created_by.full_name],
            ['Assigned To', offer.assigned_to.full_name if offer.assigned_to else 'Unassigned'],
            ['Created At', offer.created_at.strftime('%Y-%m-%d %H:%M UTC')],
        ]

        details_table = Table(details_data, colWidths=[50 * mm, 120 * mm])
        details_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f8f9fa')),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#dee2e6')),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(details_table)
        elements.append(Spacer(1, 8))

        elements.append(Paragraph('Description', styles['section']))
        elements.append(Paragraph(offer.description, styles['body']))
        elements.append(Spacer(1, 8))

        elements.append(HRFlowable(width='100%', thickness=0.5, color=colors.HexColor('#dee2e6'), spaceAfter=8))
        elements.append(Paragraph(f'Submissions ({submissions.count()})', styles['section']))

        if submissions.exists():
            sub_data = [['Company', 'Status', 'Technical Score', 'Financial Score', 'Avg Score', 'Evaluated By']]
            for sub in submissions:
                tech = float(sub.technical_score) if sub.technical_score is not None else None
                fin = float(sub.financial_score) if sub.financial_score is not None else None
                avg = f'{(tech + fin) / 2:.2f}' if (tech is not None and fin is not None) else 'N/A'
                tech_str = f'{tech:.2f}' if tech is not None else 'N/A'
                fin_str = f'{fin:.2f}' if fin is not None else 'N/A'
                evaluator = sub.evaluated_by.full_name if sub.evaluated_by else 'N/A'
                sub_data.append([
                    sub.candidate.company_name[:30],
                    sub.get_status_display(),
                    tech_str,
                    fin_str,
                    avg,
                    evaluator,
                ])

            sub_col_widths = [45 * mm, 30 * mm, 25 * mm, 25 * mm, 25 * mm, 30 * mm]
            sub_table = Table(sub_data, colWidths=sub_col_widths, repeatRows=1)
            sub_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a1a2e')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('ALIGN', (2, 0), (4, -1), 'CENTER'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#dee2e6')),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8f9fa')]),
                ('LEFTPADDING', (0, 0), (-1, -1), 4),
                ('RIGHTPADDING', (0, 0), (-1, -1), 4),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ]))
            elements.append(sub_table)
        else:
            elements.append(Paragraph('No submissions received yet.', styles['body']))

        doc.build(elements)
        buffer.seek(0)

        response = HttpResponse(buffer.read(), content_type='application/pdf')
        response['Content-Disposition'] = (
            f'attachment; filename="offer_{offer.reference_number}_{timezone.now().strftime("%Y%m%d")}.pdf"'
        )
        return response

    def _get_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')
